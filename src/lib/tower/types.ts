/**
 * 爬塔的状态形状。P0 只用 battle/elite + 线性房间，
 * 地图相关的字段先定义好，P1 接地图时不必改存档结构。
 */

import type { QuizItem } from '@/lib/quizgen/types'
import type { Language } from '@/lib/types'

export type RoomType = 'battle' | 'elite' | 'event' | 'campfire' | 'boss'

export interface AnswerRecord {
  itemId: string
  /** 原题 id：房间结束时按它聚合写 SRS */
  srcId: string
  ok: boolean
  picked: string[]
  /** 毫秒 */
  ms: number
  /** 用遗物跳过的题：不判对错、不写 SRS */
  skipped?: boolean
}

export interface RoomState {
  nodeId: string
  type: RoomType
  enemyHp: number
  enemyMaxHp: number
  items: QuizItem[]
  /** 当前题下标；等于 items.length 表示已答完 */
  index: number
  phase: 'question' | 'feedback' | 'cleared' | 'failed'
  answers: AnswerRecord[]
  combo: number
  maxCombo: number
  /** 遗物「编译器之眼」：每场首个单选题排除的错误项 */
  eliminated: Record<string, string[]>
  skipsLeft: number
  retryUsed: boolean
  hintTickets: number
  startedAt: number
}

export interface MapNode {
  id: string
  row: number
  col: number
  type: RoomType
  next: string[]
}

export interface RunStats {
  answered: number
  correct: number
  maxCombo: number
  damageDealt: number
  damageTaken: number
}

export interface RunState {
  version: 1
  runId: string
  seed: number
  layerId: string
  language: Language
  startedAt: number
  maxHp: number
  hp: number
  relics: string[]
  relicState: Record<string, number>
  path: string[]
  currentNodeId: string
  map: MapNode[]
  usedItemIds: string[]
  usedSrcCount: Record<string, number>
  room: RoomState | null
  /** 房间内待写入 SRS 的聚合结果，房间结束时统一 flush */
  pendingGrades: Record<string, { wrong: boolean; correct: number; flushed: boolean }>
  stats: RunStats
  /** 整层结束（通关或失败）时写入，未结束为 undefined */
  outcome?: 'won' | 'lost'
  endedAt?: number
}

/** SRS 里的掌握状态，选题时按它加权 */
export type SrsTag = 'wrong' | 'due' | 'fuzzy' | 'none' | 'mastered'
