import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GAPS,
  PLAYER_SPEEDS,
  StepPlayer,
  derive,
  flattenSteps,
  type FrameScheduler,
  type TimelineEvent,
} from './stepPlayer'

/** 可控的 rAF 时钟：每帧只推进固定虚拟时间，暂停/调速才能被精确断言 */
function fakeClock() {
  let now = 0
  let seq = 0
  const frames = new Map<number, (ts: number) => void>()
  const scheduler: FrameScheduler = {
    raf(cb) {
      const id = ++seq
      frames.set(id, cb)
      return id
    },
    caf(id) {
      frames.delete(id)
    },
  }
  function tick(dt: number) {
    now += dt
    const batch = [...frames.values()]
    frames.clear()
    for (const cb of batch) cb(now)
  }
  return { scheduler, tick, pending: () => frames.size, get now() { return now } }
}

/** 纯微任务冲洗：比 setTimeout(0) 快两个数量级，同时足够让 await 链 + queueMicrotask 走完 */
async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

/** 一次迭代 = 给所有活跃 wait 推进 10ms 虚拟时间（首个 tick(0) 只给新 wait 定基准） */
async function iterate(clock: ReturnType<typeof fakeClock>, n: number) {
  for (let i = 0; i < n; i++) {
    clock.tick(0)
    await flush()
    clock.tick(10)
    await flush()
  }
}

async function until(clock: ReturnType<typeof fakeClock>, predicate: () => boolean, max = 400) {
  for (let i = 0; i < max; i++) {
    if (predicate()) return i
    await iterate(clock, 1)
  }
  throw new Error('等待超时：状态未按预期推进')
}

const GAPS = { event: 100, step: 300, quick: 20 }
const mk = (steps: number[], extra: Partial<TimelineEvent<number>> = {}): TimelineEvent<number>[] =>
  steps.map((step, i) => ({ step, payload: i, duration: 0, ...extra }))

interface Rig {
  player: StepPlayer<number>
  clock: ReturnType<typeof fakeClock>
  /** 每个事件最后一次收到的进度 */
  lastFrame: Map<number, number>
}

function rig(events: TimelineEvent<number>[], stepCount: number, opts: { reduced?: boolean; speed?: number } = {}): Rig {
  const clock = fakeClock()
  const lastFrame = new Map<number, number>()
  const player = new StepPlayer<number>({
    events: () => events,
    stepCount: () => stepCount,
    gaps: GAPS,
    scheduler: clock.scheduler,
    storage: null,
    reducedMotion: () => opts.reduced ?? false,
    onFrame: (_e, i, p) => lastFrame.set(i, p),
  })
  if (opts.speed) player.setSpeed(opts.speed as (typeof PLAYER_SPEEDS)[number])
  return { player, clock, lastFrame }
}

describe('derive：单一游标派生全部视图状态', () => {
  const events = mk([0, 0, 1, 1, 1])

  it('未开始时全是 todo / future，供静读全量显示', () => {
    const s = derive({ cursor: 0, playing: false, speed: 1, events, stepCount: 2, renderIndex: -1 })
    expect(s.started).toBe(false)
    expect(s.done).toBe(false)
    expect(s.activeStep).toBe(-1)
    expect(s.stepPhases).toEqual(['todo', 'todo'])
    expect(s.itemPhases).toEqual(['future', 'future', 'future', 'future', 'future'])
  })

  it('第 2 条落地时，步骤 1 仍 active，行分 past / current / future', () => {
    const s = derive({ cursor: 2, playing: true, speed: 1, events, stepCount: 2, renderIndex: 1 })
    expect(s.activeStep).toBe(0)
    expect(s.stepPhases).toEqual(['active', 'todo'])
    expect(s.itemPhases).toEqual(['past', 'current', 'future', 'future', 'future'])
  })

  it('播放结束，步骤全 done，游标停在最后一条', () => {
    const s = derive({ cursor: 5, playing: false, speed: 1, events, stepCount: 2, renderIndex: 4 })
    expect(s.done).toBe(true)
    expect(s.stepPhases).toEqual(['done', 'done'])
    expect(s.itemPhases[4]).toBe('current')
  })
})

describe('flattenSteps：叙事步骤展平成一条事件流', () => {
  it('给每个事件打上 step 标签，前导事件为 -1', () => {
    const out = flattenSteps<number>([
      { title: 'A', events: [{ payload: 1 }, { payload: 2 }] },
      { title: 'B', events: [{ payload: 3 }] },
    ], [{ payload: 0 }])
    expect(out.map((e) => e.step)).toEqual([-1, 0, 0, 1])
    expect(out.map((e) => e.payload)).toEqual([0, 1, 2, 3])
  })
})

describe('主协程与节奏表', () => {
  it('按事件逐个推进，跨步骤停顿明显长于同步骤停顿', async () => {
    const same = rig(mk([0, 0]), 1)
    same.player.play()
    await flush()
    expect(same.player.getState().cursor).toBe(1)
    const sameTicks = await until(same.clock, () => same.player.getState().cursor === 2)

    const cross = rig(mk([0, 1]), 2)
    cross.player.play()
    await flush()
    const crossTicks = await until(cross.clock, () => cross.player.getState().cursor === 2)

    expect(crossTicks).toBeGreaterThan(sameTicks * 2)
  })

  it('quick 事件用短停顿', async () => {
    const slow = rig(mk([0, 0]), 1)
    slow.player.play()
    await flush()
    const slowTicks = await until(slow.clock, () => slow.player.getState().cursor === 2)

    const quick = rig([{ ...mk([0])[0], quick: true }, mk([0])[0]], 1)
    quick.player.play()
    await flush()
    const quickTicks = await until(quick.clock, () => quick.player.getState().cursor === 2)

    expect(quickTicks).toBeLessThan(slowTicks)
  })

  it('hold 覆盖自动节奏', async () => {
    const r = rig([{ ...mk([0])[0], hold: 900 }, mk([0])[0]], 1)
    r.player.play()
    await flush()
    const ticks = await until(r.clock, () => r.player.getState().cursor === 2)
    expect(ticks).toBeGreaterThan(80)
  })

  it('自然播完进入 done，jump/reset 不触发 onDone', async () => {
    let done = 0
    const clock = fakeClock()
    const player = new StepPlayer<number>({
      events: () => mk([0, 0]), stepCount: () => 1, gaps: GAPS,
      scheduler: clock.scheduler, storage: null, onDone: () => done++,
    })
    player.play()
    await until(clock, () => player.getState().done)
    expect(done).toBe(1)
    player.jump(2)
    player.reset()
    expect(done).toBe(1)
  })
})

describe('暂停 / 调速 / 取消', () => {
  it('暂停冻结虚拟时间，恢复后从原处继续', async () => {
    const r = rig([{ ...mk([0])[0], hold: 1000 }, mk([0])[0]], 1)
    r.player.play()
    await flush()
    await iterate(r.clock, 5)
    r.player.pause()
    await iterate(r.clock, 30)
    expect(r.player.getState().cursor).toBe(1)
    expect(r.player.getState().playing).toBe(false)
    r.player.play()
    const more = await until(r.clock, () => r.player.getState().cursor === 2)
    // 已经走过的 50ms 还在，暂停期间的 300ms 没被计入
    expect(more).toBeGreaterThan(80)
    expect(more).toBeLessThan(100)
  })

  it('2× 速度让同一段停顿少花一半虚拟时间', async () => {
    const base = rig(mk([0, 0]), 1)
    base.player.play()
    await flush()
    const baseTicks = await until(base.clock, () => base.player.getState().cursor === 2)

    const fast = rig(mk([0, 0]), 1, { speed: 2 })
    fast.player.play()
    await flush()
    const fastTicks = await until(fast.clock, () => fast.player.getState().cursor === 2)

    expect(fastTicks * 2).toBeLessThanOrEqual(baseTicks + 2)
  })

  it('跳转取消旧协程：不重播，直接把已发生事件形变到终态', async () => {
    const r = rig(mk([0, 0, 0, 0]), 1)
    r.player.play()
    await flush()
    expect(r.player.getState().cursor).toBe(1)
    r.player.jump(3)
    expect(r.player.getState().cursor).toBe(3)
    expect(r.player.getState().playing).toBe(false)
    expect([...r.lastFrame.entries()].sort((a, b) => a[0] - b[0])).toEqual([[0, 1], [1, 1], [2, 1], [3, 0]])
    await iterate(r.clock, 40)
    expect(r.player.getState().cursor).toBe(3)
    expect(r.clock.pending()).toBe(0)
  })

  it('seekStep 落在该步第一条消息，activeStep 指向目标步', () => {
    const r = rig(mk([0, 0, 1, 1, 2]), 3)
    r.player.seekStep(1)
    expect(r.player.getState().cursor).toBe(3)
    expect(r.player.getState().activeStep).toBe(1)
    expect(r.player.getState().renderIndex).toBe(2)
    r.player.seekStep(2)
    expect(r.player.getState().activeStep).toBe(2)
  })

  it('单步前后不改变 playing，reset 回到未开始的静读态', () => {
    const r = rig(mk([0, 0, 0]), 1)
    r.player.stepForward()
    expect(r.player.getState().cursor).toBe(1)
    expect(r.player.getState().playing).toBe(false)
    r.player.stepForward()
    r.player.stepBack()
    expect(r.player.getState().cursor).toBe(1)
    r.player.reset()
    expect(r.player.getState().cursor).toBe(0)
    expect(r.player.getState().started).toBe(false)
  })

  it('reduced-motion 跳过事件动画，不跳过事件之间的停顿', async () => {
    const events: TimelineEvent<number>[] = [
      { step: 0, payload: 0, duration: 5000 },
      { step: 0, payload: 1, duration: 5000 },
    ]
    const r = rig(events, 1, { reduced: true })
    r.player.play()
    await flush()
    expect(r.player.getState().cursor).toBe(1)
    expect(r.lastFrame.get(0)).toBe(1)
    await until(r.clock, () => r.player.getState().cursor === 2)
    expect(r.lastFrame.get(1)).toBe(1)
  })
})

describe('数据源与默认配置', () => {
  it('setSource 复位游标与高亮', () => {
    const r = rig(mk([0, 0]), 1)
    r.player.jump(2)
    expect(r.player.getState().done).toBe(true)
    r.player.setSource(mk([0, 0, 0]), 1)
    expect(r.player.getState().cursor).toBe(0)
    expect(r.player.getState().done).toBe(false)
    expect(r.player.getState().total).toBe(3)
  })

  it('默认节奏里跨步骤停顿最长', () => {
    expect(DEFAULT_GAPS.step).toBeGreaterThan(DEFAULT_GAPS.event)
    expect(DEFAULT_GAPS.event).toBeGreaterThan(DEFAULT_GAPS.quick)
  })

  it('构造时 dispose 后不再推进', async () => {
    const r = rig(mk([0, 0]), 1)
    r.player.play()
    await flush()
    r.player.dispose()
    await iterate(r.clock, 30)
    expect(r.player.getState().cursor).toBe(1)
  })
})
