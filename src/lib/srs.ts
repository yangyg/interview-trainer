import dayjs from 'dayjs'
import type { CardRecord, GradeResult } from './types'

/** Leitner 盒级间隔(天):答对升盒,答错回 0 盒 */
export const BOX_INTERVALS_DAYS = [1, 2, 4, 7, 15, 30]
export const MAX_BOX = BOX_INTERVALS_DAYS.length - 1

export function nextDue(box: number, result: GradeResult, now = Date.now()): { box: number; due: number } {
  if (result === 'mastered') {
    const nb = Math.min(box + 1, MAX_BOX)
    return { box: nb, due: dayjs(now).add(BOX_INTERVALS_DAYS[nb], 'day').valueOf() }
  }
  if (result === 'fuzzy') {
    // 模糊:不升盒,明天再见
    return { box, due: dayjs(now).add(1, 'day').valueOf() }
  }
  // 不会:回 0 盒,当天稍后再见(6 小时后)
  return { box: 0, due: dayjs(now).add(6, 'hour').valueOf() }
}

export function newRecord(result: GradeResult, now = Date.now()): CardRecord {
  const { box, due } = nextDue(0, result, now)
  return { status: result, box, due, lastTs: now, reviews: 1 }
}

export function isDue(record: CardRecord, now = Date.now()): boolean {
  return record.due <= now
}

export function dueText(due: number, now = Date.now()): string {
  const d = dayjs(due)
  const today = dayjs(now)
  if (d.isBefore(today)) return '已到期'
  if (d.isSame(today, 'day')) return `今天 ${d.format('HH:mm')}`
  if (d.isSame(today.add(1, 'day'), 'day')) return '明天'
  return d.format('MM-DD')
}

export function todayKey(now = Date.now()): string {
  return dayjs(now).format('YYYY-MM-DD')
}
