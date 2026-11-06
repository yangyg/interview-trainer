import { describe, expect, it } from 'vitest'
import { DAMAGE_BY_COMBO, damageOf, enemyMaxHpFor, missDamageFor, questionCountFor } from './balance'
import { accuracyOf, createRoom, resolveAnswer } from './combat'

/** 按「哪些题答对」的序列算总伤害 */
function totalDamage(hits: boolean[]): number {
  let combo = 0
  let damage = 0
  for (const hit of hits) {
    if (hit) {
      combo += 1
      damage += damageOf(combo)
    } else {
      combo = 0
    }
  }
  return damage
}

function combinations(n: number, hits: number): boolean[][] {
  const out: boolean[][] = []
  for (let mask = 0; mask < 1 << n; mask++) {
    const row: boolean[] = []
    for (let i = 0; i < n; i++) row.push(Boolean(mask & (1 << i)))
    if (row.filter(Boolean).length === hits) out.push(row)
  }
  return out
}

describe('伤害曲线', () => {
  it('连击加码、封顶后不再增长', () => {
    expect(DAMAGE_BY_COMBO[0]).toBe(10)
    expect(damageOf(2)).toBeGreaterThan(damageOf(1))
    expect(damageOf(3)).toBeGreaterThan(damageOf(2))
    expect(damageOf(9)).toBe(damageOf(4))
  })
})

describe('战斗房门槛（4 题）', () => {
  const enemyHp = enemyMaxHpFor('battle', 4)

  it('答对 3 题无论错在哪都过关', () => {
    for (const hits of combinations(4, 3)) {
      expect(totalDamage(hits), hits.join(',')).toBeGreaterThanOrEqual(enemyHp)
    }
  })

  it('答对 2 题无论排得多好都不过关', () => {
    for (const hits of combinations(4, 2)) {
      expect(totalDamage(hits), hits.join(',')).toBeLessThan(enemyHp)
    }
  })

  it('全对的溢出伤害会被回血上限截断', () => {
    const room = createRoom('r1', 'battle', [])
    const outcome = resolveAnswer({ room, correct: true, layerIndex: 1, hp: 30, maxHp: 60 })
    expect(outcome.healed).toBeLessThanOrEqual(6)
    expect(outcome.healed).toBeGreaterThanOrEqual(0)
  })
})

describe('扣血与难度曲线', () => {
  it('精英房答错扣得比战斗房多', () => {
    expect(missDamageFor('elite', 1)).toBeGreaterThan(missDamageFor('battle', 1))
  })

  it('层数越深惩罚越高，但封顶 +4', () => {
    expect(missDamageFor('battle', 3)).toBeGreaterThan(missDamageFor('battle', 1))
    expect(missDamageFor('battle', 99)).toBe(missDamageFor('battle', 1) + 4)
  })

  it('HP 归零判失败', () => {
    const room = createRoom('r1', 'battle', [])
    const outcome = resolveAnswer({ room: { ...room, enemyHp: 40 }, correct: false, layerIndex: 1, hp: 4, maxHp: 60 })
    expect(outcome.failed).toBe(true)
    expect(outcome.hp).toBe(0)
  })
})

describe('题量自适应与正确率', () => {
  it('池子小的专题自动减少每房题量', () => {
    expect(questionCountFor(9)).toBe(2)
    expect(questionCountFor(40)).toBe(3)
    expect(questionCountFor(120)).toBe(4)
  })

  it('跳过题不计入正确率', () => {
    expect(accuracyOf([
      { itemId: 'a', srcId: 's1', ok: true, picked: [], ms: 1 },
      { itemId: 'b', srcId: 's2', ok: false, picked: [], ms: 1, skipped: true },
    ])).toBe(1)
  })
})
