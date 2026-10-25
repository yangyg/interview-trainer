import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { isDue, nextDue, newRecord, todayKey } from '@/lib/srs'
import type { CardRecord, GradeResult, ProgressData } from '@/lib/types'

const STORAGE_KEY = 'interview-trainer/progress-v1'

function defaultData(): ProgressData {
  return {
    version: 1,
    cards: {},
    history: {},
    settings: { theme: 'system' },
  }
}

export const useProgressStore = defineStore('progress', () => {
  const data = useLocalStorage<ProgressData>(STORAGE_KEY, defaultData(), {
    listenToStorageChanges: true,
    mergeDefaults: true,
  })

  const cards = computed(() => data.value.cards)
  const history = computed(() => data.value.history)

  function recordOf(questionId: string): CardRecord | undefined {
    return data.value.cards[questionId]
  }

  /** 记一次自评(背题/浏览/模考通用),并累加当日学习统计 */
  function grade(questionId: string, result: GradeResult, kind: 'study' | 'quiz' = 'study') {
    const now = Date.now()
    const prev = data.value.cards[questionId]
    if (prev) {
      const { box, due } = nextDue(prev.box, result, now)
      data.value.cards[questionId] = { status: result, box, due, lastTs: now, reviews: prev.reviews + 1 }
    } else {
      data.value.cards[questionId] = newRecord(result, now)
    }
    const key = todayKey(now)
    const day = data.value.history[key] ?? { studied: 0, quiz: 0, quizTotal: 0 }
    if (kind === 'quiz') {
      day.quiz += result === 'mastered' ? 1 : 0
      day.quizTotal += 1
    } else {
      day.studied += 1
    }
    data.value.history[key] = day
  }

  function removeRecord(questionId: string) {
    delete data.value.cards[questionId]
  }

  const dueIds = computed(() =>
    Object.entries(data.value.cards)
      .filter(([, r]) => isDue(r))
      .map(([id]) => id),
  )

  const wrongIds = computed(() =>
    Object.entries(data.value.cards)
      .filter(([, r]) => r.status === 'wrong')
      .map(([id]) => id),
  )

  const statusCounts = computed(() => {
    const counts = { mastered: 0, fuzzy: 0, wrong: 0 }
    for (const r of Object.values(data.value.cards)) counts[r.status] += 1
    return counts
  })

  /** 已学过(存在记录)的题数 */
  const learnedCount = computed(() => Object.keys(data.value.cards).length)

  const todayStudied = computed(() => data.value.history[todayKey()]?.studied ?? 0)

  /** 连续学习天数(含今天或截至昨天) */
  const streak = computed(() => {
    let n = 0
    const d = new Date()
    // 今天没学不打断连续记录,从昨天起算
    if (!data.value.history[todayKey(d.getTime())]?.studied) d.setDate(d.getDate() - 1)
    for (;;) {
      const key = todayKey(d.getTime())
      if ((data.value.history[key]?.studied ?? 0) > 0) {
        n += 1
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return n
  })

  /** 最近 n 天每日学习题数(用于热力图) */
  function recentDays(n: number): { date: string; studied: number; quiz: number }[] {
    const out: { date: string; studied: number; quiz: number }[] = []
    const d = new Date()
    d.setDate(d.getDate() - (n - 1))
    for (let i = 0; i < n; i++) {
      const key = todayKey(d.getTime())
      const s = data.value.history[key]
      out.push({ date: key, studied: s?.studied ?? 0, quiz: s?.quiz ?? 0 })
      d.setDate(d.getDate() + 1)
    }
    return out
  }

  function exportJson(): string {
    return JSON.stringify(data.value, null, 2)
  }

  function importJson(text: string): { ok: boolean; message: string } {
    try {
      const parsed = JSON.parse(text) as ProgressData
      if (!parsed || parsed.version !== 1 || typeof parsed.cards !== 'object') {
        return { ok: false, message: '文件格式不正确(需要 version: 1 的进度备份)' }
      }
      data.value = {
        version: 1,
        cards: parsed.cards ?? {},
        history: parsed.history ?? {},
        settings: { ...defaultData().settings, ...parsed.settings },
      }
      return { ok: true, message: `已导入 ${Object.keys(parsed.cards ?? {}).length} 条学习记录` }
    } catch {
      return { ok: false, message: 'JSON 解析失败,请检查文件内容' }
    }
  }

  function reset() {
    data.value = defaultData()
  }

  return {
    data,
    cards,
    history,
    recordOf,
    grade,
    removeRecord,
    dueIds,
    wrongIds,
    statusCounts,
    learnedCount,
    todayStudied,
    streak,
    recentDays,
    exportJson,
    importJson,
    reset,
  }
})
