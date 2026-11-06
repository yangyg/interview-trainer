/**
 * 客观小题的类型：由 scripts/build-quiz.mjs 在构建期生成，
 * 运行时只读。这里的定义必须与生成器产物保持一致，
 * validate.ts 会用这套结构对产物做运行时校验（而不是只靠类型声明）。
 */

import type { Language } from '@/lib/types'

export type QuizType = 'T1' | 'T2' | 'T3' | 'T4'

export interface QuizOption {
  key: string
  /** 已净化的行内 HTML：只含 <code> / <strong> */
  html: string
  /** 干扰项溯源，仅审计用，不参与判定 */
  from?: string
}

interface QuizItemBase {
  /** `${srcId}:${type}:${n}`，题库更新后由题号保持稳定 */
  id: string
  type: QuizType
  /** 原题 id —— 学习进度只绑它，不绑 item id */
  srcId: string
  topicId: string
  chapter: string
  difficulty: 1 | 2 | 3
  stemHtml: string
  explainHtml: string
}

/** 术语单选 */
export interface T1Item extends QuizItemBase {
  type: 'T1'
  options: QuizOption[]
  answerKey: string
}

/** 要点多选：判定 = 集合完全相等 */
export interface T2Item extends QuizItemBase {
  type: 'T2'
  options: QuizOption[]
  answerKeys: string[]
}

/** 步骤排序：判定 = 逐位相等 */
export interface T3Item extends QuizItemBase {
  type: 'T3'
  options: QuizOption[]
  order: string[]
  firstPinned: boolean
}

/** 代码输出 */
export interface T4Item extends QuizItemBase {
  type: 'T4'
  codeHtml: string
  options: QuizOption[]
  answerKey: string
}

export type QuizItem = T1Item | T2Item | T3Item | T4Item

export interface QuizPool {
  topicId: string
  items: QuizItem[]
}

export interface QuizIndexTopic {
  id: string
  language: Language
  name: string
  /** 客观小题数 */
  items: number
  /** 可作 Boss 口述的原题数 */
  bosses: number
}

export interface QuizIndex {
  version: 1
  generatedAt: string
  sourceGeneratedAt: string
  buildHash: string
  counts: { total: number; byType: Record<QuizType, number> }
  topics: QuizIndexTopic[]
}
