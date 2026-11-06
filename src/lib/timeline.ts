/**
 * 过程类内容的统一时间轴适配层
 *
 * 播放引擎（stepPlayer.ts）只认一条 TimelineEvent[]，但讲义里「按先后发生」的东西
 * 长得完全不一样：flow 的 items、layers 的堆叠、state 的状态链、sequence 的消息、
 * principle 的拆解步骤。这里把它们归一成同一种载荷，让同一套四区联动 UI 能复用。
 *
 * 刻意不新增任何课程字段：所有事件都从既有结构推导，作者源零改动即可播放。
 */

import type { PlayerGaps, TimelineEvent } from './stepPlayer'
import { buildSequenceTimeline } from './sequenceTimeline'
import type { DiagramSpec, LessonBlock, SequenceDiagram, SequenceMessage } from './types'

export type SeqTag = NonNullable<SequenceMessage['tag']>
export type PlayableKind = 'flow' | 'layers' | 'state' | 'sequence' | 'principle'

/** 一次事件在渲染层需要的全部信息；富文本标记原样保留，交给 RichText 解析 */
export interface PlayablePayload {
  /** 0 起的事件下标 */
  index: number
  /** 1 起的显示序号 */
  no: number
  label: string
  /** 注解：note / transitions[i-1] / step.detail */
  detail?: string
  tone?: 'primary' | 'warn' | 'muted' | 'bad'
  /** 分类编码，贯穿编号圆点、列表行、泳道箭头 */
  tag: SeqTag
  /** 以下仅 sequence 提供，供泳道推导方向 */
  from?: string
  to?: string
  fromIdx?: number
  toIdx?: number
  reply?: boolean
}

export interface ProcessStep {
  title: string
  detail?: string
}

export interface ProcessTimeline<P = PlayablePayload> {
  kind: PlayableKind
  events: TimelineEvent<P>[]
  /** 空数组表示作者没写 steps，渲染层不显示步骤条 */
  steps: ProcessStep[]
  /** 恒 >= 1 */
  stepCount: number
  gaps?: Partial<PlayerGaps>
  /** 仅 sequence 提供 */
  lanes?: { actors: string[]; actorIndexes: Map<string, number> }
  /** state 的回退边不进游标，仍由渲染层画静态角标 */
  back?: { from: number; to: number; label: string }
}

export type PrincipleBlock = Extract<LessonBlock, { kind: 'principle' }>
export type PlayableSource = DiagramSpec | PrincipleBlock

/** 会被接入步进播放的图示类型；其余保持静态快照 */
export const PLAYABLE_DIAGRAMS = new Set(['flow', 'layers', 'state', 'sequence'] as const)
export type PlayableDiagramType = 'flow' | 'layers' | 'state' | 'sequence'

/** 单条事件的默认入场时长，与 sequence 保持一致 */
export const DEFAULT_EVENT_DURATION = 340

function event(
  index: number,
  label: string,
  extra: Partial<Omit<PlayablePayload, 'index' | 'no' | 'label'>> = {},
): TimelineEvent<PlayablePayload> {
  return {
    step: 0,
    duration: DEFAULT_EVENT_DURATION,
    payload: { index, no: index + 1, label, tag: 'request', ...extra },
  }
}

/** flow：items 的先后顺序就是流向，direction 只影响静态布局、不进时间轴 */
export function buildFlowTimeline(
  diagram: Extract<DiagramSpec, { type: 'flow' }>,
): ProcessTimeline {
  return {
    kind: 'flow',
    events: diagram.items.map((item, i) => event(i, item.label, { detail: item.note })),
    steps: [],
    stepCount: 1,
  }
}

/** layers：自上而下的堆叠/执行顺序 */
export function buildLayersTimeline(
  diagram: Extract<DiagramSpec, { type: 'layers' }>,
): ProcessTimeline {
  return {
    kind: 'layers',
    events: diagram.items.map((item, i) =>
      event(i, item.label, {
        detail: item.note,
        ...(item.tone === 'primary' ? { tone: 'primary' as const } : {}),
        ...(item.tone === 'muted' ? { tone: 'muted' as const } : {}),
      }),
    ),
    steps: [],
    stepCount: 1,
  }
}

/** state：进入第 i 个状态的条件是 transitions[i-1]；back 不参与游标 */
export function buildStateTimeline(
  diagram: Extract<DiagramSpec, { type: 'state' }>,
): ProcessTimeline {
  const states = diagram.states.map((s) => (typeof s === 'string' ? { label: s } : s))
  const transitions = diagram.transitions ?? []
  const events = states.map((s, i) =>
    event(i, s.label, {
      detail: (i > 0 ? transitions[i - 1] : undefined) ?? s.note,
      tone: s.tone,
      tag: i === 0 ? 'request' : 'data',
    }),
  )
  return {
    kind: 'state',
    events,
    steps: [],
    stepCount: 1,
    ...(diagram.back ? { back: diagram.back } : {}),
  }
}

/** principle：已有「带竖线的有序步骤」，本质就是静态时间轴 */
export function buildPrincipleTimeline(block: PrincipleBlock): ProcessTimeline {
  return {
    kind: 'principle',
    events: (block.steps ?? []).map((s, i) =>
      event(i, s.title, { detail: s.detail, tag: 'data' }),
    ),
    steps: [],
    stepCount: 1,
  }
}

/**
 * sequence：复用 buildSequenceTimeline 的 step 继承 / 方向解析 / tag 推导，
 * 只把载荷换成统一形状，泳道几何信息单独挂在 lanes 上。
 */
export function adaptSequenceTimeline(diagram: SequenceDiagram): ProcessTimeline {
  const base = buildSequenceTimeline(diagram)
  const events: TimelineEvent<PlayablePayload>[] = base.events.map((e) => ({
    step: e.step,
    ...(e.duration != null ? { duration: e.duration } : {}),
    ...(e.quick === true ? { quick: true } : {}),
    ...(typeof e.hold === 'number' ? { hold: e.hold } : {}),
    payload: {
      index: e.payload.index,
      no: e.payload.no,
      label: e.payload.text,
      detail: diagram.steps?.[e.step]?.detail,
      tag: e.payload.tag,
      from: e.payload.from,
      to: e.payload.to,
      fromIdx: e.payload.fromIdx,
      toIdx: e.payload.toIdx,
      reply: e.payload.reply,
    },
  }))
  return {
    kind: 'sequence',
    events,
    steps: base.steps,
    stepCount: base.stepCount,
    ...(diagram.gaps ? { gaps: diagram.gaps } : {}),
    lanes: { actors: diagram.actors, actorIndexes: base.actorIndexes },
  }
}

/** 归一化入口：返回 null 表示该内容没有时间序，渲染层应退回静态渲染 */
export function toProcessTimeline(source: PlayableSource): ProcessTimeline | null {
  if (!('type' in source)) {
    const t = buildPrincipleTimeline(source)
    return isPlayable(t) ? t : null
  }
  let timeline: ProcessTimeline | null = null
  switch (source.type) {
    case 'flow':
      timeline = buildFlowTimeline(source)
      break
    case 'layers':
      timeline = buildLayersTimeline(source)
      break
    case 'state':
      timeline = buildStateTimeline(source)
      break
    case 'sequence':
      timeline = adaptSequenceTimeline(source)
      break
    default:
      return null
  }
  return isPlayable(timeline) ? timeline : null
}

/** 只有两个及以上事件才值得挂播放器；单条只是静态快照 */
export function isPlayable(t: ProcessTimeline | null): t is ProcessTimeline {
  return t !== null && t.events.length >= 2
}
