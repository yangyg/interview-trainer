/**
 * 判定：全部是纯函数，单选/多选的语义差异都在这里收敛，
 * UI 与战斗逻辑只消费 boolean。
 */

import type { QuizItem } from './types'

/** 选中的选项 key；排序题为「从左到右的 key 序列」 */
export type AnswerInput = string[]

export function isMulti(item: QuizItem): boolean {
  return item.type === 'T2'
}

export function isOrdered(item: QuizItem): boolean {
  return item.type === 'T3'
}

/** 正确答案的 key 集合（展示「正确答案」时用） */
export function correctKeysOf(item: QuizItem): string[] {
  switch (item.type) {
    case 'T1':
    case 'T4':
      return [item.answerKey]
    case 'T2':
      return [...item.answerKeys].sort()
    case 'T3':
      return [...item.order]
  }
}

/**
 * 判定一次作答。
 * - T1 / T4：恰好选中唯一正确项
 * - T2：集合完全相等（多选少选都算错）
 * - T3：顺序逐位相等
 */
export function judge(item: QuizItem, picked: AnswerInput): boolean {
  switch (item.type) {
    case 'T1':
    case 'T4':
      return picked.length === 1 && picked[0] === item.answerKey
    case 'T2': {
      if (picked.length !== item.answerKeys.length) return false
      const a = [...picked].sort().join(',')
      const b = [...item.answerKeys].sort().join(',')
      return a === b
    }
    case 'T3': {
      if (picked.length !== item.order.length) return false
      return picked.every((key, i) => key === item.order[i])
    }
  }
}

/** 选项是否正确（反馈态渲染用；排序题无此概念，返回空） */
export function optionStateOf(item: QuizItem, key: string): 'correct' | 'wrong' | 'neutral' {
  if (item.type === 'T1' || item.type === 'T4') return key === item.answerKey ? 'correct' : 'neutral'
  if (item.type === 'T2') return item.answerKeys.includes(key) ? 'correct' : 'neutral'
  return 'neutral'
}
