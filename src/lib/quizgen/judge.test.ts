import { describe, expect, it } from 'vitest'
import { correctKeysOf, isMulti, judge, optionStateOf } from './judge'
import type { QuizItem } from './types'

const base = {
  srcId: 'java-01-Q1',
  topicId: 'java-01',
  chapter: '第一章',
  difficulty: 2 as const,
  stemHtml: '<p>题干</p>',
  explainHtml: '<p>解析</p>',
}

const options = [
  { key: 'A', html: 'A' },
  { key: 'B', html: 'B' },
  { key: 'C', html: 'C' },
  { key: 'D', html: 'D' },
]

const t1: QuizItem = { ...base, id: 'java-01-Q1:t1:1', type: 'T1', options, answerKey: 'C' }
const t2: QuizItem = { ...base, id: 'java-01-Q1:t2:1', type: 'T2', options, answerKeys: ['A', 'D'] }
const t3: QuizItem = {
  ...base,
  id: 'java-01-Q1:t3:1',
  type: 'T3',
  options,
  order: ['B', 'A', 'D'],
  firstPinned: false,
}
const t4: QuizItem = { ...base, id: 'java-01-Q1:t4:1', type: 'T4', options, answerKey: 'A', codeHtml: '<pre></pre>' }

describe('judge', () => {
  it('单选必须恰好选中正确项', () => {
    expect(judge(t1, ['C'])).toBe(true)
    expect(judge(t1, ['A'])).toBe(false)
    expect(judge(t1, [])).toBe(false)
    expect(judge(t1, ['A', 'C'])).toBe(false)
    expect(judge(t4, ['A'])).toBe(true)
  })

  it('多选是集合相等：少选、多选、选错都算错', () => {
    expect(judge(t2, ['A', 'D'])).toBe(true)
    expect(judge(t2, ['D', 'A'])).toBe(true)
    expect(judge(t2, ['A'])).toBe(false)
    expect(judge(t2, ['A', 'B', 'D'])).toBe(false)
    expect(judge(t2, ['B', 'C'])).toBe(false)
  })

  it('排序必须逐位相等', () => {
    expect(judge(t3, ['B', 'A', 'D'])).toBe(true)
    expect(judge(t3, ['A', 'B', 'D'])).toBe(false)
    expect(judge(t3, ['B', 'A'])).toBe(false)
  })

  it('correctKeysOf 与选项态一致', () => {
    expect(correctKeysOf(t1)).toEqual(['C'])
    expect(correctKeysOf(t2)).toEqual(['A', 'D'])
    expect(correctKeysOf(t3)).toEqual(['B', 'A', 'D'])
    expect(optionStateOf(t2, 'D')).toBe('correct')
    expect(optionStateOf(t2, 'B')).toBe('neutral')
    expect(isMulti(t2)).toBe(true)
    expect(isMulti(t1)).toBe(false)
  })
})
