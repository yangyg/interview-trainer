/**
 * 局内选题：从本语言的小题池里按房间类型 + SRS 状态加权抽题。
 *
 * 三条硬约束：
 * 1. 本层内同一道小题不重复
 * 2. 同一条原题在整层内最多出 2 道不同题型（避免一局全是同一段话）
 * 3. SRS 里错得多的题权重更高 —— 这是把「玩」变成「复习」的通道
 */

import type { QuizItem } from './types'
import type { RoomType, SrsTag } from '@/lib/tower/types'
import { pickWeighted } from '@/lib/tower/rng'

const TYPE_WEIGHT: Record<RoomType, Partial<Record<QuizItem['type'], number>>> = {
  battle: { T1: 1, T2: 0.9, T3: 0.7, T4: 0.25 },
  elite: { T1: 0.8, T2: 1.3, T3: 1.2, T4: 1.2 },
  event: { T1: 0.9, T2: 0.6, T3: 1, T4: 1.4 },
  campfire: {},
  boss: {},
}

const SRS_WEIGHT: Record<SrsTag, number> = {
  wrong: 2.4,
  due: 1.7,
  fuzzy: 1.3,
  none: 1,
  mastered: 0.5,
}

const DIFFICULTY_WEIGHT = [1.1, 1, 0.85]

export interface SelectOptions {
  pool: QuizItem[]
  roomType: RoomType
  count: number
  usedItemIds: ReadonlySet<string>
  /** srcId -> 本层已出题次数 */
  usedSrcCount: ReadonlyMap<string, number>
  srsTagOf: (srcId: string) => SrsTag
  difficultyBand: [number, number]
  rand: () => number
}

export function selectItems(options: SelectOptions): QuizItem[] {
  const { pool, roomType, count, usedItemIds, usedSrcCount, srsTagOf, difficultyBand, rand } = options
  const typeWeight = TYPE_WEIGHT[roomType] ?? {}

  const candidates = pool.filter((item) => {
    if (usedItemIds.has(item.id)) return false
    if (item.difficulty < difficultyBand[0] || item.difficulty > difficultyBand[1]) return false
    const used = usedSrcCount.get(item.srcId) ?? 0
    return used < 2
  })

  const weightOf = (item: QuizItem): number => {
    const byType = typeWeight[item.type] ?? 0
    if (byType <= 0) return 0
    const used = usedSrcCount.get(item.srcId) ?? 0
    const softPenalty = used === 0 ? 1 : 0.25
    return byType * SRS_WEIGHT[srsTagOf(item.srcId)] * DIFFICULTY_WEIGHT[item.difficulty - 1] * softPenalty
  }

  const picked = pickWeighted(candidates, weightOf, count, rand)

  // 房内先易后难：最后几题更紧张
  return picked.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id))
}
