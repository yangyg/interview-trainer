import { describe, expect, it } from 'vitest'
import { BOX_INTERVALS_DAYS, MAX_BOX, isDue, newRecord, nextDue, todayKey } from './srs'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
/** 取北半球夏季的本地时间,避开夏令时切换导致 +N 天不等于 N*24h */
const NOW = new Date(2026, 5, 15, 9, 0, 0).getTime()

describe('nextDue', () => {
  it('掌握升一盒,间隔取新盒的天数', () => {
    expect(nextDue(0, 'mastered', NOW)).toEqual({ box: 1, due: NOW + 2 * DAY })
    expect(nextDue(2, 'mastered', NOW)).toEqual({ box: 3, due: NOW + 7 * DAY })
  })

  it('最高盒封顶,不再升盒', () => {
    expect(nextDue(MAX_BOX, 'mastered', NOW)).toEqual({
      box: MAX_BOX,
      due: NOW + BOX_INTERVALS_DAYS[MAX_BOX] * DAY,
    })
  })

  it('模糊不升盒,明天再见', () => {
    expect(nextDue(3, 'fuzzy', NOW)).toEqual({ box: 3, due: NOW + DAY })
  })

  it('不会回 0 盒,6 小时后再见', () => {
    expect(nextDue(4, 'wrong', NOW)).toEqual({ box: 0, due: NOW + 6 * HOUR })
  })
})

describe('newRecord', () => {
  it('首次就掌握也会进入 1 盒', () => {
    expect(newRecord('mastered', NOW)).toEqual({
      status: 'mastered',
      box: 1,
      due: NOW + 2 * DAY,
      lastTs: NOW,
      reviews: 1,
    })
  })

  it('首次不会则当天复习', () => {
    expect(newRecord('wrong', NOW)).toMatchObject({ status: 'wrong', box: 0, due: NOW + 6 * HOUR })
  })
})

describe('isDue / todayKey', () => {
  it('按到期时间戳判断,临界点视为到期', () => {
    const record = newRecord('fuzzy', NOW)
    expect(isDue(record, NOW + DAY - 1)).toBe(false)
    expect(isDue(record, NOW + DAY)).toBe(true)
  })

  it('日期键使用本地时区 YYYY-MM-DD', () => {
    expect(todayKey(NOW)).toBe('2026-06-15')
  })
})
