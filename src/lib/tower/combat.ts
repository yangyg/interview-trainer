/**
 * 战斗数值的纯函数部分：不碰 Vue、不碰 store，便于单测。
 * store 只负责把结果写进状态。
 */

import { damageOf, enemyMaxHpFor, missDamageFor, OVERFLOW_HEAL_CAP, OVERFLOW_HEAL_RATIO } from './balance'
import type { AnswerRecord, RoomState, RoomType } from './types'

export function createRoom(nodeId: string, type: RoomType, items: RoomState['items']): RoomState {
  return {
    nodeId,
    type,
    enemyHp: enemyMaxHpFor(type, items.length),
    enemyMaxHp: enemyMaxHpFor(type, items.length),
    items,
    index: 0,
    phase: 'question',
    answers: [],
    combo: 0,
    maxCombo: 0,
    eliminated: {},
    skipsLeft: 0,
    retryUsed: false,
    hintTickets: 0,
    startedAt: Date.now(),
  }
}

export interface AnswerOutcome {
  /** 对敌人造成的伤害 */
  damage: number
  /** 溢出转化成的回血（只会发生在击破的最后一击） */
  healed: number
  /** 玩家掉血 */
  taken: number
  combo: number
  cleared: boolean
  failed: boolean
  enemyHp: number
  hp: number
}

/**
 * 结算一题。
 *
 * 溢出回血只在本题击破敌人时给：伤害超出剩余血量的部分 × 0.4，
 * 上限 6 —— 这让「连对」有额外收益，但不至于让 HP 通胀。
 */
export function resolveAnswer(input: {
  room: RoomState
  correct: boolean
  layerIndex: number
  hp: number
  maxHp: number
}): AnswerOutcome {
  const { room, correct, layerIndex } = input
  const combo = correct ? room.combo + 1 : 0
  const damage = correct ? damageOf(combo) : 0
  const enemyHpAfter = Math.max(0, room.enemyHp - damage)

  let healed = 0
  if (correct && room.enemyHp > 0 && enemyHpAfter === 0) {
    healed = Math.min(OVERFLOW_HEAL_CAP, Math.round((damage - room.enemyHp) * OVERFLOW_HEAL_RATIO))
    healed = Math.max(0, healed)
  }

  const taken = correct ? 0 : missDamageFor(room.type, layerIndex)
  const hpAfter = Math.min(input.maxHp, input.hp - taken + healed)

  return {
    damage,
    healed,
    taken,
    combo,
    cleared: enemyHpAfter === 0,
    failed: hpAfter <= 0,
    enemyHp: enemyHpAfter,
    hp: Math.max(0, hpAfter),
  }
}

export function isRoomFinished(room: RoomState): boolean {
  return room.phase === 'cleared' || room.phase === 'failed'
}

export function accuracyOf(answers: AnswerRecord[]): number {
  const counted = answers.filter((a) => !a.skipped)
  if (!counted.length) return 0
  return counted.filter((a) => a.ok).length / counted.length
}
