import type { Language } from './types'

/** 全部语言,顺序即 UI 展示顺序(首页卡片 / 题库与课程的语言切换) */
export const LANGUAGES: readonly Language[] = ['java', 'go', 'ai', 'arch']

/**
 * 各语言的视觉识别体系:徽章底色 / 进度条颜色 / 缩写 / 卡片标题。
 * 新增语言时只需改这里 + types 里的 Language 联合类型。
 */
export const LANG_META: Record<
  Language,
  { label: string; title: string; short: string; badge: string; bar: string }
> = {
  java: {
    label: 'Java',
    title: 'Java 后端',
    short: 'J',
    // 徽章是白字底色,必须满足 4.5:1;进度条不承载文字,保留更亮的品牌色
    badge: 'bg-amber-700',
    bar: 'bg-amber-500',
  },
  go: {
    label: 'Golang',
    title: 'Golang 后端',
    short: 'Go',
    badge: 'bg-cyan-700',
    bar: 'bg-cyan-600',
  },
  ai: {
    label: 'AI',
    title: 'AI 应用与大模型',
    short: 'AI',
    badge: 'bg-violet-600',
    bar: 'bg-violet-500',
  },
  arch: {
    label: '架构设计',
    title: '架构设计与系统设计',
    short: 'A',
    badge: 'bg-emerald-700',
    bar: 'bg-emerald-600',
  },
}
