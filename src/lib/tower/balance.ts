/**
 * 全部可调数值的唯一入口。
 * 调平衡只改这里，不碰组件与 store。
 *
 * 设计约束（combat.test.ts 会断言）：
 * - 战斗房答对 3/4 必过，答对 2/4 必不过（连击不加倍时也成立）
 * - 精英房多一题，靠「扣血更多」而不是更高的伤害门槛来体现难度
 */

import type { RoomType } from './types'

export const MAX_HP = 60

/** 连击第 n 题（1 起）的伤害：第 2 题起加码，第 4 题起封顶 */
export const DAMAGE_BY_COMBO = [10, 15, 20, 20] as const

export function damageOf(combo: number): number {
  const index = Math.min(Math.max(combo, 1), DAMAGE_BY_COMBO.length) - 1
  return DAMAGE_BY_COMBO[index]
}

/** 敌人血量：按题量线性给，保证「答对 3/4」稳定过关 */
export function enemyMaxHpFor(type: RoomType, questionCount: number): number {
  const perQuestion = type === 'elite' ? 9 : 9
  return Math.max(10, questionCount * perQuestion - 1)
}

export const MISS_DAMAGE: Record<RoomType, number> = {
  battle: 6,
  elite: 8,
  event: 8,
  campfire: 0,
  boss: 6,
}

/** 每层递增的答错惩罚，上限 +4 */
export function missDamageFor(type: RoomType, layerIndex = 1): number {
  const extra = Math.min(4, Math.floor(Math.max(0, layerIndex - 1) / 2))
  return MISS_DAMAGE[type] + extra
}

export const OVERFLOW_HEAL_RATIO = 0.4
export const OVERFLOW_HEAL_CAP = 6

export const BOSS_ENEMY_HP = 50
export const BOSS_DAMAGE = { mastered: 20, fuzzy: 10, wrong: 0 } as const
export const BOSS_MISS_DAMAGE = { mastered: 0, fuzzy: 6, wrong: 12 } as const
export const BOSS_TIME_LIMIT_SEC = 90

/** 每题限时：战斗房 0 表示不限时（P0 不加倒计时） */
export const QUESTION_TIME_LIMIT_SEC = 0

/** 遗物：每场战斗可跳过的题数 */
export const SKIP_PER_ROOM = 1

/** 房间题目数：池子小的专题自动缩，避免一局刷穿题库 */
export function questionCountFor(poolSize: number): number {
  return Math.min(4, Math.max(2, Math.round(poolSize / 12)))
}
