/**
 * 爬塔状态：局内 run（sessionStorage）+ 局外 meta（localStorage）。
 *
 * 两个刻意的设计：
 * 1. run 放 sessionStorage —— 刷新不丢、也不能靠刷新重开刷血；
 *    关掉浏览器三天后回来不会出现「我为什么在这」的困惑。
 * 2. 学习进度只在房间结束时按原题聚合写一次（flushGrades），
 *    且「答对」最多把题推到 fuzzy —— mastered 只能由口述产生。
 */

import { useLocalStorage, useSessionStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { judge } from '@/lib/quizgen/judge'
import { selectItems } from '@/lib/quizgen/select'
import type { QuizItem } from '@/lib/quizgen/types'
import { isDue } from '@/lib/srs'
import { MAX_HP, questionCountFor } from '@/lib/tower/balance'
import { createRoom, resolveAnswer } from '@/lib/tower/combat'
import { hashString, mulberry32 } from '@/lib/tower/rng'
import type { AnswerOutcome } from '@/lib/tower/combat'
import type { MapNode, RunState, SrsTag } from '@/lib/tower/types'
import { reportStorageError } from '@/lib/storage-health'
import { useProgressStore } from './progress'
import { useTowerDataStore } from './towerData'

const RUN_KEY = 'interview-trainer/run-v1'
const META_KEY = 'interview-trainer/tower-v1'

export interface TowerMeta {
  version: 1
  cleared: Record<string, {
    firstAt: number
    best: { hpLeft: number; accuracy: number; maxCombo: number }
  }>
  unlockedRelics: string[]
  stats: { runs: number; wins: number; answers: number; correct: number; maxCombo: number }
  lastRun?: { layerId: string; hp: number; at: number }
  /** 「这题有误」的本机黑名单，选题时跳过 */
  blockedItems: string[]
}

/**
 * 初始值是 null，VueUse 会推断成 any 序列化器，把对象写成 "[object Object]"。
 * 这里显式用 JSON，并容忍历史坏值：解析失败就当没有存档，避免刷新后被坏数据卡死。
 */
const runSerializer = {
  read(raw: string): RunState | null {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? (parsed as RunState) : null
    } catch {
      return null
    }
  },
  write(value: unknown): string {
    return JSON.stringify(value)
  },
}

function defaultMeta(): TowerMeta {
  return {
    version: 1,
    cleared: {},
    unlockedRelics: [],
    stats: { runs: 0, wins: 0, answers: 0, correct: 0, maxCombo: 0 },
    blockedItems: [],
  }
}

/** P0 的层是三条直线的房间；P1 换成 buildMap() 生成的分叉图，存档结构不变 */
function buildLinearMap(): MapNode[] {
  return [
    { id: 'r1', row: 0, col: 0, type: 'battle', next: ['r2'] },
    { id: 'r2', row: 1, col: 0, type: 'battle', next: ['r3'] },
    { id: 'r3', row: 2, col: 0, type: 'elite', next: [] },
  ]
}

export const useTowerStore = defineStore('tower', () => {
  const run = useSessionStorage<RunState | null>(RUN_KEY, null, {
    serializer: runSerializer,
    onError: (error) => reportStorageError('爬塔进度', error),
  })
  const meta = useLocalStorage<TowerMeta>(META_KEY, defaultMeta(), {
    listenToStorageChanges: true,
    mergeDefaults: true,
    onError: (error) => reportStorageError('爬塔记录', error),
  })

  const busy = ref(false)
  const error = ref('')
  const questionStartedAt = ref(Date.now())

  const status = computed<'idle' | 'playing' | 'won' | 'lost'>(() => {
    if (!run.value) return 'idle'
    if (run.value.outcome === 'lost') return 'lost'
    if (run.value.outcome === 'won') return 'won'
    return 'playing'
  })

  const room = computed(() => run.value?.room ?? null)
  const currentItem = computed<QuizItem | null>(() => {
    const active = run.value?.room
    if (!active) return null
    // 反馈态也要返回当前题：答完仍要把题干和解析留在屏幕上
    return active.items[active.index] ?? null
  })
  const lastAnswer = computed(() => {
    const active = run.value?.room
    if (!active?.answers.length) return null
    return active.answers[active.answers.length - 1]
  })
  const progressInRoom = computed(() => {
    const active = run.value?.room
    if (!active) return { index: 0, total: 0 }
    return { index: active.index, total: active.items.length }
  })
  const clearedCount = computed(() => Object.keys(meta.value.cleared).length)

  function srsTagOf(srcId: string): SrsTag {
    const record = useProgressStore().recordOf(srcId)
    if (!record) return 'none'
    if (record.status === 'wrong') return 'wrong'
    if (isDue(record)) return 'due'
    if (record.status === 'fuzzy') return 'fuzzy'
    return 'mastered'
  }

  async function enterNode(nodeId: string) {
    const state = run.value
    if (!state) return
    const node = state.map.find((item) => item.id === nodeId)
    if (!node) return

    const data = useTowerDataStore()
    const pool = data.poolOf(state.layerId) ?? (await data.loadPool(state.layerId))
    const usable = pool.items.filter((item) => !meta.value.blockedItems.includes(item.id))

    const usedIds = new Set(state.usedItemIds)
    const usedSrc = new Map(Object.entries(state.usedSrcCount))
    const rand = mulberry32(hashString(`${state.seed}:${nodeId}`))
    const count = questionCountFor(usable.length)
    const items = selectItems({
      pool: usable,
      roomType: node.type,
      count,
      usedItemIds: usedIds,
      usedSrcCount: usedSrc,
      srsTagOf,
      difficultyBand: [1, 3],
      rand,
    })

    for (const item of items) {
      state.usedItemIds.push(item.id)
      state.usedSrcCount[item.srcId] = (state.usedSrcCount[item.srcId] ?? 0) + 1
    }

    state.currentNodeId = nodeId
    if (!state.path.includes(nodeId)) state.path.push(nodeId)
    state.room = createRoom(nodeId, node.type, items)
    questionStartedAt.value = Date.now()
  }

  async function startRun(layerId: string) {
    busy.value = true
    error.value = ''
    try {
      const data = useTowerDataStore()
      const index = await data.loadIndex()
      const topic = index?.topics.find((item) => item.id === layerId)
      if (!topic) throw new Error(`未知的层：${layerId}`)
      await data.loadPool(layerId)

      const seed = hashString(`${layerId}:${Date.now()}`)
      run.value = {
        version: 1,
        runId: `${layerId}:${seed}`,
        seed,
        layerId,
        language: topic.language,
        startedAt: Date.now(),
        maxHp: MAX_HP,
        hp: MAX_HP,
        relics: [],
        relicState: {},
        path: [],
        currentNodeId: '',
        map: buildLinearMap(),
        usedItemIds: [],
        usedSrcCount: {},
        room: null,
        pendingGrades: {},
        stats: { answered: 0, correct: 0, maxCombo: 0, damageDealt: 0, damageTaken: 0 },
      }
      meta.value.stats.runs += 1
      meta.value.lastRun = { layerId, hp: MAX_HP, at: Date.now() }
      await enterNode('r1')
    } catch (err) {
      error.value = err instanceof Error ? err.message : '开局失败'
      run.value = null
    } finally {
      busy.value = false
    }
  }

  /** 刷新后恢复：只恢复未结束的对局 */
  async function resumeRun() {
    const state = run.value
    if (!state || state.outcome) return
    // 旧版本（或手工写入）可能留下非对象存档，直接丢弃，走新开一局
    if (typeof state !== 'object' || !state.layerId || !Array.isArray(state.map)) {
      run.value = null
      return
    }
    const data = useTowerDataStore()
    await data.loadIndex()
    // 房间已存在时题目都在存档里，不必联网；只有需要进下一个房间才拉题池
    if (!state.room) {
      await data.loadPool(state.layerId)
      await enterNode(state.map[0]?.id ?? 'r1')
    }
  }

  function answer(picked: string[]): AnswerOutcome | null {
    const state = run.value
    const active = state?.room
    if (!state || !active || active.phase !== 'question') return null
    const item = active.items[active.index]
    if (!item) return null

    const ok = judge(item, picked)
    const outcome = resolveAnswer({
      room: active,
      correct: ok,
      layerIndex: 1,
      hp: state.hp,
      maxHp: state.maxHp,
    })

    active.answers.push({
      itemId: item.id,
      srcId: item.srcId,
      ok,
      picked,
      ms: Math.max(0, Date.now() - questionStartedAt.value),
    })
    active.combo = outcome.combo
    active.maxCombo = Math.max(active.maxCombo, outcome.combo)
    active.enemyHp = outcome.enemyHp

    state.hp = outcome.hp
    state.stats.answered += 1
    if (ok) state.stats.correct += 1
    state.stats.damageDealt += outcome.damage
    state.stats.damageTaken += outcome.taken
    state.stats.maxCombo = Math.max(state.stats.maxCombo, outcome.combo)

    const pending = state.pendingGrades[item.srcId] ?? { wrong: false, correct: 0, flushed: false }
    if (ok) {
      pending.correct += 1
    } else {
      pending.wrong = true
      pending.flushed = false
    }
    state.pendingGrades[item.srcId] = pending

    if (outcome.failed) {
      active.phase = 'failed'
      flushGrades()
    } else {
      active.phase = 'feedback'
    }
    return outcome
  }

  function nextQuestion() {
    const active = run.value?.room
    if (!active || active.phase !== 'feedback') return
    active.index += 1
    if (active.index >= active.items.length) {
      // 题答完了但敌人没死：撤离，HP 与已写记录都保留
      active.phase = 'cleared'
      flushGrades()
      return
    }
    active.phase = 'question'
    questionStartedAt.value = Date.now()
  }

  /**
   * 房间结束：按原题聚合并写一次学习进度。
   * - 有任意一小题答错 → wrong
   * - 全对且无记录 / 原本是 wrong → fuzzy
   * - 全对且已是 fuzzy / mastered → 不动
   * mastered 只能由 Boss 口述产生，客观题永远推不到。
   */
  function flushGrades() {
    const state = run.value
    if (!state) return
    const progress = useProgressStore()
    for (const [srcId, entry] of Object.entries(state.pendingGrades)) {
      if (entry.flushed) continue
      if (entry.wrong) {
        progress.grade(srcId, 'wrong', 'study')
      } else {
        const record = progress.recordOf(srcId)
        if (!record || record.status === 'wrong') progress.grade(srcId, 'fuzzy', 'study')
      }
      entry.flushed = true
    }
  }

  function recordWin(state: RunState) {
    const accuracy = state.stats.answered ? state.stats.correct / state.stats.answered : 0
    const prev = meta.value.cleared[state.layerId]
    meta.value.cleared[state.layerId] = {
      firstAt: prev?.firstAt ?? Date.now(),
      best: {
        hpLeft: Math.max(prev?.best.hpLeft ?? 0, state.hp),
        accuracy: Math.max(prev?.best.accuracy ?? 0, accuracy),
        maxCombo: Math.max(prev?.best.maxCombo ?? 0, state.stats.maxCombo),
      },
    }
    meta.value.stats.wins += 1
    meta.value.stats.answers += state.stats.answered
    meta.value.stats.correct += state.stats.correct
    meta.value.stats.maxCombo = Math.max(meta.value.stats.maxCombo, state.stats.maxCombo)
    meta.value.lastRun = undefined
  }

  async function advance() {
    const state = run.value
    const active = state?.room
    if (!state || !active) return
    flushGrades()

    if (active.phase === 'failed') {
      state.outcome = 'lost'
      state.endedAt = Date.now()
      meta.value.lastRun = { layerId: state.layerId, hp: state.hp, at: Date.now() }
      return
    }

    const node = state.map.find((item) => item.id === active.nodeId)
    const nextId = node?.next[0]
    if (!nextId) {
      if (active.enemyHp <= 0) {
        state.outcome = 'won'
        state.endedAt = Date.now()
        recordWin(state)
      } else {
        state.outcome = 'lost'
        state.endedAt = Date.now()
      }
      return
    }
    state.room = null
    await enterNode(nextId)
  }

  /** 放弃本局：已写入的学习记录不回滚 */
  function abandon() {
    const state = run.value
    if (!state) return
    flushGrades()
    run.value = null
  }

  function reset() {
    run.value = null
    meta.value = defaultMeta()
  }

  function blockItem(itemId: string) {
    if (!meta.value.blockedItems.includes(itemId)) meta.value.blockedItems.push(itemId)
  }

  return {
    run,
    meta,
    busy,
    error,
    status,
    room,
    currentItem,
    lastAnswer,
    progressInRoom,
    clearedCount,
    srsTagOf,
    startRun,
    resumeRun,
    answer,
    nextQuestion,
    advance,
    abandon,
    reset,
    blockItem,
    flushGrades,
  }
})
