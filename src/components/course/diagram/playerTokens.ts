/** 播放器四区共用的视觉编码：三态、分类色、步骤态。别在各组件里各写一份。 */
import type { ItemPhase, StepPhase } from '@/lib/stepPlayer'
import type { SeqTag } from '@/lib/timeline'

export type ViewPhase = 'idle' | ItemPhase

/** 未开始 = 全量静读；开始后才分 past / current / future 三态 */
export function phaseOf(i: number, started: boolean, phases: readonly ItemPhase[]): ViewPhase {
  return started ? (phases[i] ?? 'future') : 'idle'
}

export const ROW_CLASS: Record<ViewPhase, string> = {
  idle: 'border-border/60 bg-card opacity-100',
  past: 'border-border/60 bg-card opacity-70',
  current: 'border-primary/45 bg-primary/[0.06] opacity-100',
  future: 'border-border/40 bg-card opacity-40',
}

export const STEP_CLASS: Record<StepPhase, string> = {
  done: 'border-border/70 bg-muted/40 text-muted-foreground',
  active: 'border-primary/40 bg-primary/[0.08] text-primary',
  todo: 'border-border/60 bg-card text-muted-foreground/70',
}

export const TAG_TEXT: Record<SeqTag, string> = {
  request: 'text-primary',
  response: 'text-emerald-600 dark:text-emerald-400',
  data: 'text-cyan-600 dark:text-cyan-400',
  note: 'text-amber-600 dark:text-amber-400',
}

export const TAG_DOT: Record<SeqTag, string> = {
  request: 'bg-primary',
  response: 'bg-emerald-600 dark:bg-emerald-400',
  data: 'bg-cyan-600 dark:bg-cyan-400',
  note: 'bg-amber-600 dark:bg-amber-400',
}

export const TAG_LABEL: Record<SeqTag, string> = {
  request: '请求',
  response: '响应',
  data: '数据',
  note: '状态',
}
