/**
 * 产物校验：生成器是 .mjs、运行时是 .ts，两侧没有共享类型。
 * 这里对产物做结构校验，由 vitest 直接跑在 public/data/quiz 上——
 * 比「类型声明看起来一致」更能抓到真实漂移。
 */

import type { QuizItem, QuizPool } from './types'

export function validateItem(item: unknown, path: string): string[] {
  const errors: string[] = []
  if (!item || typeof item !== 'object') return [`${path}: 不是对象`]
  const it = item as Partial<QuizItem> & Record<string, unknown>

  for (const field of ['id', 'type', 'srcId', 'topicId', 'chapter', 'stemHtml', 'explainHtml']) {
    if (typeof it[field] !== 'string' || !(it[field] as string).length) {
      errors.push(`${path}: 缺少字段 ${field}`)
    }
  }
  if (!['T1', 'T2', 'T3', 'T4'].includes(String(it.type))) errors.push(`${path}: 未知题型 ${String(it.type)}`)
  if (![1, 2, 3].includes(Number(it.difficulty))) errors.push(`${path}: difficulty 必须是 1/2/3`)

  const options = it.options
  if (!Array.isArray(options) || options.length < 4 || options.length > 5) {
    errors.push(`${path}: 选项数必须是 4–5`)
    return errors
  }
  const keys = new Set<string>()
  for (const option of options as { key?: unknown; html?: unknown }[]) {
    if (typeof option.key !== 'string' || typeof option.html !== 'string' || !option.html.length) {
      errors.push(`${path}: 选项缺少 key/html`)
      continue
    }
    if (keys.has(option.key)) errors.push(`${path}: 选项 key 重复 ${option.key}`)
    keys.add(option.key)
  }

  if (it.type === 'T1' || it.type === 'T4') {
    if (typeof it.answerKey !== 'string' || !keys.has(it.answerKey)) errors.push(`${path}: answerKey 不在选项里`)
  }
  if (it.type === 'T2') {
    const answerKeys = it.answerKeys
    if (!Array.isArray(answerKeys) || answerKeys.length < 2 || answerKeys.length > 3) {
      errors.push(`${path}: T2 需要 2–3 个正确项`)
    } else {
      for (const key of answerKeys as string[]) {
        if (!keys.has(key)) errors.push(`${path}: answerKeys 含不存在的选项 ${key}`)
      }
      if (answerKeys.length >= options.length) errors.push(`${path}: 正确项不能占满全部选项`)
    }
  }
  if (it.type === 'T3') {
    const order = it.order
    if (!Array.isArray(order) || order.length !== options.length) errors.push(`${path}: T3 order 长度不符`)
    if (typeof it.firstPinned !== 'boolean') errors.push(`${path}: T3 缺少 firstPinned`)
  }

  return errors
}

export function validatePool(pool: unknown, name = 'pool'): string[] {
  const errors: string[] = []
  if (!pool || typeof pool !== 'object') return [`${name}: 不是对象`]
  const parsed = pool as Partial<QuizPool>
  if (typeof parsed.topicId !== 'string') errors.push(`${name}: 缺少 topicId`)
  if (!Array.isArray(parsed.items)) return [...errors, `${name}: items 不是数组`]

  const seen = new Set<string>()
  parsed.items.forEach((item, index) => {
    const path = `${name}[${index}]${item && typeof item === 'object' ? `:${(item as QuizItem).id}` : ''}`
    errors.push(...validateItem(item, path))
    const id = (item as QuizItem)?.id
    if (typeof id === 'string') {
      if (seen.has(id)) errors.push(`${path}: id 重复`)
      seen.add(id)
    }
  })
  return errors
}
