import { describe, expect, it } from 'vitest'
import { buildSequenceTimeline, DEFAULT_EVENT_DURATION, shortLabel } from './sequenceTimeline'
import type { SequenceDiagram } from './types'

const base: SequenceDiagram = {
  type: 'sequence',
  actors: ['Client', 'DNS', 'Server'],
  messages: [
    { from: 'Client', to: 'DNS', step: 0, text: '**查询** A 记录', quick: true },
    { from: 'DNS', to: 'Client', text: '返回 203.0.113.10', reply: true },
    { from: 'Client', to: 'Server', step: 1, text: 'SYN', duration: 200, hold: 800 },
    { from: 'Server', to: 'Client', text: 'SYN-ACK', reply: true, tag: 'note' },
  ],
  steps: [
    { title: '解析', detail: '拿 IP' },
    { title: '建连', detail: '三次握手' },
  ],
}

describe('buildSequenceTimeline', () => {
  it('step 只在分组起点写，后续继承；与消息序号是多对一', () => {
    const t = buildSequenceTimeline(base)
    expect(t.events.map((e) => e.step)).toEqual([0, 0, 1, 1])
    expect(t.stepCount).toBe(2)
    expect(t.steps[0].title).toBe('解析')
  })

  it('actor 下标解析后方向可直接推导，回程不用另画一张图', () => {
    const t = buildSequenceTimeline(base)
    expect(t.events.map((e) => [e.payload.fromIdx, e.payload.toIdx])).toEqual([
      [0, 1], [1, 0], [0, 2], [2, 0],
    ])
  })

  it('分类色由 reply / tag 推导，quick 与时长、停顿透传给引擎', () => {
    const t = buildSequenceTimeline(base)
    expect(t.events.map((e) => e.payload.tag)).toEqual(['request', 'response', 'request', 'note'])
    expect(t.events[0].quick).toBe(true)
    expect(t.events[0].duration).toBe(DEFAULT_EVENT_DURATION)
    expect(t.events[2].duration).toBe(200)
    expect(t.events[2].hold).toBe(800)
    expect(t.events[2].quick).toBeUndefined()
  })

  it('没写 steps 时全部留在 step 0，跨步停顿自然不生效', () => {
    const t = buildSequenceTimeline({
      ...base,
      steps: undefined,
      messages: base.messages.map((m) => ({ ...m, step: undefined })),
    })
    expect(t.events.map((e) => e.step)).toEqual([0, 0, 0, 0])
    expect(t.steps).toEqual([])
    expect(t.stepCount).toBe(1)
  })

  it('越界 step 被夹到合法范围，不会让步骤条点空', () => {
    const t = buildSequenceTimeline({ ...base, messages: [{ ...base.messages[0], step: 99 }, base.messages[1]] })
    expect(t.events.every((e) => e.step < t.stepCount)).toBe(true)
  })
})

describe('shortLabel', () => {
  it('去掉 markdown 标记并折叠空白，过长截断', () => {
    expect(shortLabel('**查询**  `A`  记录', 20)).toBe('查询 A 记录')
    expect(shortLabel('这是一段明显超过长度上限的说明文字', 6)).toBe('这是一段明显…')
  })
})
