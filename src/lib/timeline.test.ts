import { describe, expect, it } from 'vitest'
import { derive } from './stepPlayer'
import {
  DEFAULT_EVENT_DURATION,
  PLAYABLE_DIAGRAMS,
  adaptSequenceTimeline,
  buildFlowTimeline,
  buildLayersTimeline,
  buildPrincipleTimeline,
  buildStateTimeline,
  isPlayable,
  toProcessTimeline,
  type PrincipleBlock,
} from './timeline'
import type { DiagramSpec, SequenceDiagram } from './types'

const flow = (over: Partial<Extract<DiagramSpec, { type: 'flow' }>> = {}) =>
  ({
    type: 'flow',
    items: [
      { label: '**第一步**', note: '入口' },
      { label: '[[关键]] 第二步' },
      { label: '!!易错!! 第三步' },
    ],
    ...over,
  }) as Extract<DiagramSpec, { type: 'flow' }>

const oldSequence: SequenceDiagram = {
  type: 'sequence',
  actors: ['Client', 'Server'],
  messages: [
    { from: 'Client', to: 'Server', text: 'SYN' },
    { from: 'Server', to: 'Client', text: 'SYN-ACK', reply: true },
    { from: 'Client', to: 'Server', text: 'ACK' },
  ],
}

const steppedSequence: SequenceDiagram = {
  type: 'sequence',
  actors: ['Client', 'DNS', 'Server'],
  steps: [{ title: '解析', detail: '先拿到 IP' }, { title: '握手' }, { title: '交换', detail: '收发报文' }],
  gaps: { event: 300 },
  messages: [
    { from: 'Client', to: 'DNS', text: '查询', step: 0, tag: 'request' },
    { from: 'DNS', to: 'Client', text: '应答', reply: true, step: 0, quick: true },
    { from: 'Client', to: 'Server', text: 'SYN', step: 1 },
    { from: 'Server', to: 'Client', text: 'ACK', reply: true, step: 2, hold: 900 },
  ],
}

const principle = (steps: { title: string; detail: string }[] = [
  { title: '第一步', detail: '细节一' },
  { title: '第二步', detail: '细节二' },
  { title: '第三步', detail: '细节三' },
]) => ({ kind: 'principle', title: '机制', steps } as PrincipleBlock)

describe('flow / layers 归一', () => {
  it('flow 的 items 变成有序事件，富文本标记原样保留', () => {
    const t = buildFlowTimeline(flow({ direction: 'v' }))
    expect(t.kind).toBe('flow')
    expect(t.events).toHaveLength(3)
    expect(t.events.map((e) => e.payload.label)).toEqual([
      '**第一步**',
      '[[关键]] 第二步',
      '!!易错!! 第三步',
    ])
    expect(t.events[0].payload.detail).toBe('入口')
    expect(t.events[1].payload.detail).toBeUndefined()
    expect(t.events.every((e) => e.step === 0 && e.duration === DEFAULT_EVENT_DURATION)).toBe(true)
    // direction 只影响静态布局，不进时间轴
    expect(JSON.stringify(t)).not.toContain('direction')
  })

  it('layers 把 tone 映射成统一载荷', () => {
    const d = {
      type: 'layers',
      items: [
        { label: '应用层', note: 'HTTP', tone: 'primary' },
        { label: '传输层', tone: 'muted' },
        { label: '网络层' },
      ],
    } as Extract<DiagramSpec, { type: 'layers' }>
    const t = buildLayersTimeline(d)
    expect(t.events.map((e) => e.payload.tone)).toEqual(['primary', 'muted', undefined])
    expect(t.events[0].payload.detail).toBe('HTTP')
    expect(t.stepCount).toBe(1)
  })
})

describe('state 归一', () => {
  it('字符串写法：transitions[i-1] 成为进入第 i 个状态的注解', () => {
    const d = {
      type: 'state',
      states: ['Closed', 'Open', 'HalfOpen'],
      transitions: ['失败率超阈值', '等待窗口到期'],
    } as Extract<DiagramSpec, { type: 'state' }>
    const t = buildStateTimeline(d)
    expect(t.events.map((e) => e.payload.label)).toEqual(['Closed', 'Open', 'HalfOpen'])
    expect(t.events.map((e) => e.payload.detail)).toEqual([
      undefined,
      '失败率超阈值',
      '等待窗口到期',
    ])
    expect(t.events.map((e) => e.payload.tag)).toEqual(['request', 'data', 'data'])
  })

  it('对象写法：note 作为 transition 缺失时的回退，tone 透传', () => {
    const d = {
      type: 'state',
      states: [
        { label: '初始', note: '刚启动', tone: 'primary' },
        { label: '运行', note: '兜底注解' },
      ],
      transitions: [],
    } as Extract<DiagramSpec, { type: 'state' }>
    const t = buildStateTimeline(d)
    expect(t.events[0].payload.detail).toBe('刚启动')
    expect(t.events[0].payload.tone).toBe('primary')
    expect(t.events[1].payload.detail).toBe('兜底注解')
  })

  it('transitions 缺失或错位不抛错，back 原样透传且不产生事件', () => {
    const d = {
      type: 'state',
      states: ['A', 'B', 'C'],
      back: { from: 3, to: 1, label: '回退' },
    } as Extract<DiagramSpec, { type: 'state' }>
    const t = buildStateTimeline(d)
    expect(t.back).toEqual({ from: 3, to: 1, label: '回退' })
    expect(t.events).toHaveLength(3)
    expect(t.events.every((e) => e.payload.detail === undefined)).toBe(true)
  })
})

describe('principle 归一', () => {
  it('拆解步骤变成事件，detail / tag 正确', () => {
    const t = buildPrincipleTimeline(principle())
    expect(t.kind).toBe('principle')
    expect(t.events).toHaveLength(3)
    expect(t.events[1].payload).toMatchObject({ label: '第二步', detail: '细节二', tag: 'data' })
    expect(t.steps).toEqual([])
  })

  it('步骤不足 2 条时不接播放器', () => {
    expect(toProcessTimeline(principle([{ title: '唯一一步', detail: '' }]))).toBeNull()
    expect(toProcessTimeline(principle())).not.toBeNull()
  })
})

describe('sequence 复用既有适配结果', () => {
  it('带 steps 时 step 继承、detail 来自所属步骤、quick/hold/tag 保留', () => {
    const t = adaptSequenceTimeline(steppedSequence)
    expect(t.steps).toHaveLength(3)
    expect(t.stepCount).toBe(3)
    expect(t.gaps).toEqual({ event: 300 })
    expect(t.events.map((e) => e.step)).toEqual([0, 0, 1, 2])
    expect(t.events[0].payload.detail).toBe('先拿到 IP')
    expect(t.events[2].payload.detail).toBeUndefined()
    expect(t.events[3].payload.detail).toBe('收发报文')
    expect(t.events[1].quick).toBe(true)
    expect(t.events[3].hold).toBe(900)
    expect(t.events[1].payload.tag).toBe('response')
  })

  it('泳道几何信息透传，方向由 actor 下标推导', () => {
    const t = adaptSequenceTimeline(steppedSequence)
    expect(t.lanes?.actors).toEqual(['Client', 'DNS', 'Server'])
    expect(t.lanes?.actorIndexes.get('Server')).toBe(2)
    expect(t.events[3].payload).toMatchObject({ fromIdx: 2, toIdx: 0, reply: true })
  })

  it('老数据零改动：无 steps / 无 gaps 也能播放', () => {
    const t = toProcessTimeline(oldSequence)
    expect(t).not.toBeNull()
    expect(t!.steps).toEqual([])
    expect(t!.stepCount).toBe(1)
    expect(t!.gaps).toBeUndefined()
    expect(t!.events.length).toBeGreaterThanOrEqual(2)
    expect(t!.lanes?.actorIndexes.get('Server')).toBe(1)
    expect(t!.events[1].payload.tag).toBe('response')
  })
})

describe('接入边界与派生状态', () => {
  it('PLAYABLE_DIAGRAMS 只含四类过程型图示', () => {
    expect([...PLAYABLE_DIAGRAMS].sort()).toEqual(['flow', 'layers', 'sequence', 'state'])
  })

  it('无时间序的图示一律退回静态', () => {
    const staticSpecs: DiagramSpec[] = [
      { type: 'matrix', cols: ['A', 'B'], rows: [['x', 'y', 'z']] },
      { type: 'tree', root: { label: 'root' } },
      { type: 'split', left: { title: 'L', items: ['a'] }, right: { title: 'R', items: ['b'] } },
      { type: 'scale', items: [{ label: 'a', value: 1, display: '1' }] },
      { type: 'memory', regions: [{ name: 'A', slots: [] }, { name: 'B', slots: [] }] },
      {
        type: 'contain',
        items: [{ label: 'JDK' }, { label: 'JRE' }, { label: 'JVM' }],
        base: { label: '操作系统' },
      },
    ]
    for (const d of staticSpecs) expect(toProcessTimeline(d)).toBeNull()
  })

  it('contain 是集合包含关系，没有时间先后，不进可播放列表', () => {
    const d: DiagramSpec = {
      type: 'contain',
      items: [{ label: 'JDK' }, { label: 'JRE' }, { label: 'JVM' }],
    }
    const playableTypes: string[] = [...PLAYABLE_DIAGRAMS]
    expect(playableTypes).not.toContain('contain')
    expect(toProcessTimeline(d)).toBeNull()
  })

  it('单事件不算可播放', () => {
    expect(isPlayable(null)).toBe(false)
    expect(toProcessTimeline(flow({ items: [{ label: '只有一步' }] }))).toBeNull()
  })

  it('适配器输出可被 derive 直接消费，静读态保持未开始', () => {
    for (const source of [flow(), oldSequence, steppedSequence, principle()]) {
      const t = toProcessTimeline(source)!
      const s = derive({
        cursor: 0,
        playing: false,
        speed: 1,
        events: t.events,
        stepCount: t.stepCount,
      })
      expect(s.started).toBe(false)
      expect(s.total).toBe(t.events.length)
      expect(s.activeStep).toBe(-1)
      expect(s.itemPhases.every((p) => p === 'future')).toBe(true)
    }
  })
})
