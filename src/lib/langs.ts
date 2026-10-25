import type { Language } from './types'

/** 三语言的视觉识别体系:徽章底色 / 进度条颜色 / 缩写 */
export const LANG_META: Record<Language, { label: string; short: string; badge: string; bar: string }> = {
  java: { label: 'Java', short: 'J', badge: 'bg-amber-500', bar: 'bg-amber-500' },
  go: { label: 'Golang', short: 'Go', badge: 'bg-cyan-600', bar: 'bg-cyan-600' },
  ai: { label: 'AI', short: 'AI', badge: 'bg-violet-500', bar: 'bg-violet-500' },
}
