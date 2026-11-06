import type { TimelineEvent } from './stepPlayer'
import type { SequenceDiagram, SequenceMessage, SequenceStep } from './types'

/** 一条消息在播放引擎里的载荷：视图渲染所需的全部字段，都在这里算好 */
export interface SequenceEvent {
  index: number
  from: string
  to: string
  fromIdx: number
  toIdx: number
  text: string
  reply: boolean
  tag: NonNullable<SequenceMessage['tag']>
  /** 1 起的显示序号 */
  no: number
}

export interface SequenceTimeline {
  events: TimelineEvent<SequenceEvent>[]
  steps: SequenceStep[]
  /** 步骤总数：没写 steps 时按消息里显式 step 的最大值推，供跨步停顿使用 */
  stepCount: number
  actorIndexes: Map<string, number>
}

export const SEQUENCE_TAGS = new Set<NonNullable<SequenceMessage['tag']>>([
  'request',
  'response',
  'data',
  'note',
])

/** 一条消息的入场默认时长：够看清箭头画出来，又不至于拖慢整段演示 */
export const DEFAULT_EVENT_DURATION = 340

/**
 * 把作者写的「步骤 + 消息」变成引擎要的一条事件流。
 * - step 只写在分组起点，后续继承；没写 steps 时全部留在 step 0，跨步停顿自然不生效。
 * - from/to 在 actor 数组里的下标在此解析，方向由下标大小推导，回程不需要另画一张图。
 */
export function buildSequenceTimeline(diagram: SequenceDiagram): SequenceTimeline {
  const actorIndexes = new Map(diagram.actors.map((a, i) => [a, i]))
  const steps = diagram.steps ?? []
  const maxAuthorStep = steps.length - 1
  let step = 0
  let maxStep = 0

  const events: TimelineEvent<SequenceEvent>[] = diagram.messages.map((m, i) => {
    if (typeof m.step === 'number') {
      step = maxAuthorStep >= 0 ? Math.max(0, Math.min(m.step, maxAuthorStep)) : Math.max(0, m.step)
    }
    maxStep = Math.max(maxStep, step)
    const payload: SequenceEvent = {
      index: i,
      no: i + 1,
      from: m.from,
      to: m.to,
      fromIdx: actorIndexes.get(m.from) ?? 0,
      toIdx: actorIndexes.get(m.to) ?? 0,
      text: m.text,
      reply: m.reply === true,
      tag: m.tag ?? (m.reply ? 'response' : 'request'),
    }
    return {
      step,
      payload,
      duration: m.duration ?? DEFAULT_EVENT_DURATION,
      ...(m.quick === true ? { quick: true } : {}),
      ...(typeof m.hold === 'number' ? { hold: m.hold } : {}),
    }
  })

  return {
    events,
    steps,
    stepCount: steps.length ? steps.length : maxStep + 1,
    actorIndexes,
  }
}

/** 短标签：泳道里放不下整句说明，只留编号 + 前若干字 */
export function shortLabel(text: string, max = 16): string {
  const plain = text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}
