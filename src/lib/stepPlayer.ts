/**
 * 通用步进播放引擎（框架无关）
 *
 * 借自 Protocol Explorer 的四件套，但去掉了协议专用部分：
 *   ① 数据层：steps[].events[] 展平成一条事件流，播放单位是 event，不是 step、也不是 packet；
 *   ② 状态层：只有一个游标 cursor，其余全部由 derive() 纯函数派生；
 *   ③ 广播层：onChange 用 queueMicrotask 合并通知，一次回调供多个视图渲染；
 *   ④ 时间层：唯一时间源是 rAF 虚拟时钟，暂停不累加、倍速作乘数、token 可取消。
 *
 * 没有 setInterval / setTimeout 递归，也没有 CSS transition 计时：动画进度由
 * onFrame(event, index, 0→1) 逐帧交给渲染层自行写属性。jump/reset 不重播，
 * 直接把所有事件「形变」到目标状态。
 */

export const PLAYER_SPEEDS = [0.5, 1, 1.5, 2] as const
export type PlayerSpeed = (typeof PLAYER_SPEEDS)[number]
export const SPEED_STORAGE_KEY = 'interview-trainer/player-speed'

export interface PlayerGaps {
  /** 同一步内普通事件之后的停顿(ms) */
  event: number
  /** 跨教学步骤的停顿(ms)：给读者一个喘气点，明显长于普通事件 */
  step: number
  /** 连续快事件（如同一批数据包）之后的停顿(ms) */
  quick: number
}

export const DEFAULT_GAPS: PlayerGaps = { event: 420, step: 1000, quick: 130 }

export interface TimelineEvent<T> {
  /** 0 起的教学步骤序号；-1 表示不属于任何步骤的前导事件 */
  step: number
  payload: T
  /** 入场动画时长(ms)，播放时以 0→1 进度回调逐帧给出；缺省为瞬时 */
  duration?: number
  /** 本事件后走「短停顿」，用于同一步内的连续快包 */
  quick?: boolean
  /** 覆盖事件后的停顿(ms) */
  hold?: number
}

export interface TimelineStep<T> {
  title: string
  detail?: string
  events: Omit<TimelineEvent<T>, 'step'>[]
}

/** steps[].events[] → 一条带 step 标签的事件流 */
export function flattenSteps<T>(
  steps: readonly TimelineStep<T>[],
  prelude: Omit<TimelineEvent<T>, 'step'>[] = [],
): TimelineEvent<T>[] {
  const out: TimelineEvent<T>[] = prelude.map((e) => ({ ...e, step: -1 }))
  steps.forEach((s, i) => s.events.forEach((e) => out.push({ ...e, step: i })))
  return out
}

export type StepPhase = 'done' | 'active' | 'todo'
export type ItemPhase = 'past' | 'current' | 'future'

export interface DeriveInput<T> {
  cursor: number
  playing: boolean
  speed: PlayerSpeed
  events: readonly TimelineEvent<T>[]
  stepCount: number
  /** 当前高亮的事件下标：动画进行中指向正在绘制的那条，静止时 = cursor - 1 */
  renderIndex?: number
  frame?: number
}

export interface PlayerState {
  /** 已落地（动画播完）的事件数 */
  cursor: number
  total: number
  playing: boolean
  /** 是否已经开始过演示；false 时视图保持「全量静读」 */
  started: boolean
  done: boolean
  speed: PlayerSpeed
  /** 当前高亮事件下标，-1 = 未开始 */
  renderIndex: number
  /** 当前事件的动画进度 0→1 */
  frame: number
  /** -1 = 未开始 */
  activeStep: number
  stepPhases: StepPhase[]
  itemPhases: ItemPhase[]
}

/** 纯函数：所有视图都从这一个状态派生，绝不各自维护游标 */
export function derive<T>(input: DeriveInput<T>): PlayerState {
  const { cursor, playing, speed, events, stepCount } = input
  const total = events.length
  const renderIndex = input.renderIndex ?? cursor - 1
  const frame = input.frame ?? (renderIndex >= 0 ? 1 : 0)
  const started = cursor > 0 || playing || renderIndex >= 0
  const done = total > 0 && cursor >= total
  const activeStep = done ? stepCount - 1 : renderIndex >= 0 ? (events[renderIndex]?.step ?? -1) : -1

  const stepPhases: StepPhase[] = Array.from({ length: stepCount }, (_, i): StepPhase => {
    if (!started) return 'todo'
    if (done) return 'done'
    if (activeStep < 0) return 'todo'
    return i < activeStep ? 'done' : i === activeStep ? 'active' : 'todo'
  })
  const itemPhases: ItemPhase[] = events.map((_, i): ItemPhase =>
    i < renderIndex ? 'past' : i === renderIndex ? 'current' : 'future',
  )

  return { cursor, total, playing, started, done, speed, renderIndex, frame, activeStep, stepPhases, itemPhases }
}

export interface FrameScheduler {
  raf(cb: (ts: number) => void): number
  caf(handle: number): void
}

const browserScheduler: FrameScheduler = {
  raf: (cb) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(cb)
      : (setTimeout(() => cb(performance.now()), 16) as unknown as number),
  caf: (h) =>
    typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame(h)
      : clearTimeout(h as unknown as ReturnType<typeof setTimeout>),
}

export interface StepPlayerConfig<T> {
  /** getter 而非快照：数据源变化时由 setSource() 触发重建 */
  events: () => readonly TimelineEvent<T>[]
  stepCount: () => number
  gaps?: Partial<PlayerGaps>
  reducedMotion?: () => boolean
  scheduler?: FrameScheduler
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
  /** 逐帧回调：动画进度交给渲染层 */
  onFrame?: (event: TimelineEvent<T>, index: number, progress: number) => void
  /** 自然播放到结尾（jump / reset 不触发） */
  onDone?: () => void
}

interface Token {
  cancelled: boolean
}

function readSpeed(storage: StepPlayerConfig<unknown>['storage']): PlayerSpeed {
  try {
    const raw = storage?.getItem(SPEED_STORAGE_KEY)
    const v = Number(raw)
    return PLAYER_SPEEDS.includes(v as PlayerSpeed) ? (v as PlayerSpeed) : 1
  } catch {
    return 1
  }
}

export class StepPlayer<T> {
  private gaps: PlayerGaps
  private readonly reduced: () => boolean
  private readonly scheduler: FrameScheduler
  private readonly storage: StepPlayerConfig<T>['storage']
  private readonly onFrame?: StepPlayerConfig<T>['onFrame']
  private readonly onDone?: () => void

  private events: readonly TimelineEvent<T>[] = []
  private stepCount = 0
  private cursor = 0
  private playing = false
  private paused = false
  private speed: PlayerSpeed
  private renderIndex = -1
  private frame = 0

  private token: Token = { cancelled: false }
  /** 每次取消 +1，用来让旧协程的 finally 不覆盖新协程的状态 */
  private generation = 0
  private loopGeneration = -1
  private loopRunning = false

  private readonly pending = new Set<number>()
  private readonly waitResolvers = new Set<() => void>()
  private readonly resumeWaiters = new Set<() => void>()
  private readonly listeners = new Set<(s: PlayerState) => void>()
  private readonly animations = new Set<Animation>()
  private notifyScheduled = false
  private disposed = false

  constructor(config: StepPlayerConfig<T>) {
    this.gaps = { ...DEFAULT_GAPS, ...config.gaps }
    this.reduced = config.reducedMotion ?? (() => false)
    this.scheduler = config.scheduler ?? browserScheduler
    this.storage = config.storage
    this.onFrame = config.onFrame
    this.onDone = config.onDone
    this.speed = readSpeed(config.storage)
    this.setSource(config.events(), config.stepCount())
  }

  // ---------- 状态 ----------

  getState(): PlayerState {
    return derive({
      cursor: this.cursor,
      playing: this.playing,
      speed: this.speed,
      events: this.events,
      stepCount: this.stepCount,
      renderIndex: this.renderIndex,
      frame: this.frame,
    })
  }

  /** microtask 合并：同一帧内多次 notify 只广播一次 */
  private notify() {
    if (this.notifyScheduled || this.disposed) return
    this.notifyScheduled = true
    queueMicrotask(() => {
      this.notifyScheduled = false
      if (this.disposed) return
      const snapshot = this.getState()
      for (const fn of this.listeners) fn(snapshot)
    })
  }

  /** 订阅派生状态，返回退订函数 */
  subscribe(fn: (s: PlayerState) => void): () => void {
    this.listeners.add(fn)
    fn(this.getState())
    return () => this.listeners.delete(fn)
  }

  // ---------- 时间源 ----------

  /**
   * 唯一的时间源。acc 只在未暂停时累加，速度是乘数；token 取消时立刻 resolve，
   * 让 await 中的主协程干净退出。返回 Promise 而非定时器 id，故可被 async 组合。
   */
  private wait(duration: number, token: Token, onProgress?: (p: number) => void): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false
      let acc = 0
      let last: number | null = null
      let handle: number | null = null
      const finish = () => {
        if (settled) return
        settled = true
        if (handle !== null) {
          this.pending.delete(handle)
          handle = null
        }
        this.waitResolvers.delete(finish)
        resolve()
      }
      this.waitResolvers.add(finish)

      const d = Math.max(0, duration)
      if (d === 0 || token.cancelled || this.disposed) {
        onProgress?.(1)
        finish()
        return
      }
      const tick = (ts: number) => {
        if (handle !== null) this.pending.delete(handle)
        handle = null
        if (token.cancelled || this.disposed) return finish()
        if (last !== null && !this.paused) acc += Math.max(0, ts - last) * this.speed
        last = ts
        const p = Math.min(1, acc / d)
        onProgress?.(p)
        if (p < 1) {
          handle = this.scheduler.raf(tick)
          this.pending.add(handle)
        } else {
          finish()
        }
      }
      handle = this.scheduler.raf(tick)
      this.pending.add(handle)
    })
  }

  private waitResume(token: Token): Promise<void> {
    if (token.cancelled || this.playing) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const waiter = () => {
        this.resumeWaiters.delete(waiter)
        resolve()
      }
      this.resumeWaiters.add(waiter)
    })
  }

  private cancelToken() {
    this.token.cancelled = true
    this.token = { cancelled: false }
    this.generation += 1
    this.loopRunning = false
    for (const id of this.pending) this.scheduler.caf(id)
    this.pending.clear()
    for (const resolve of [...this.waitResolvers]) resolve()
    this.waitResolvers.clear()
    for (const waiter of [...this.resumeWaiters]) waiter()
    this.resumeWaiters.clear()
    for (const anim of this.animations) anim.cancel()
    this.animations.clear()
  }

  // ---------- 主协程 ----------

  private async loop(gen: number, token: Token) {
    try {
      while (!token.cancelled && !this.disposed) {
        const events = this.events
        if (this.cursor >= events.length) return this.finish()
        if (!this.playing || this.paused) {
          await this.waitResume(token)
          if (token.cancelled || this.disposed) return
          continue
        }

        const i = this.cursor
        const ev = events[i]
        const duration = this.reduced() ? 0 : (ev.duration ?? 0)
        await this.wait(duration, token, (p) => this.emitFrame(ev, i, p))
        if (token.cancelled || this.disposed) return

        this.cursor = i + 1
        this.renderIndex = i
        this.frame = 1
        this.notify()
        if (this.cursor >= events.length) return this.finish()

        await this.wait(this.gapFor(i), token)
      }
    } finally {
      if (this.loopGeneration === gen) this.loopRunning = false
    }
  }

  /** 跨步骤的停顿比普通事件长：叙事节奏靠这张表，而不是把真实耗时照搬过来 */
  private gapFor(i: number): number {
    const cur = this.events[i]
    const next = this.events[i + 1]
    if (!next) return 0
    if (typeof cur.hold === 'number') return Math.max(0, cur.hold)
    if (next.step !== cur.step) return this.gaps.step
    return cur.quick ? this.gaps.quick : this.gaps.event
  }

  private emitFrame(ev: TimelineEvent<T>, index: number, p: number) {
    this.renderIndex = index
    this.frame = p
    this.onFrame?.(ev, index, p)
    this.notify()
  }

  private finish() {
    this.playing = false
    this.paused = false
    this.frame = 1
    this.notify()
    this.onDone?.()
  }

  // ---------- 控制面 ----------

  play() {
    if (this.disposed || this.events.length === 0) return
    if (this.cursor >= this.events.length) this.reset()
    this.playing = true
    this.paused = false
    for (const anim of this.animations) anim.play()
    for (const waiter of [...this.resumeWaiters]) waiter()
    this.notify()
    if (!this.loopRunning || this.loopGeneration !== this.generation) {
      this.loopGeneration = this.generation
      this.loopRunning = true
      void this.loop(this.generation, this.token)
    }
  }

  pause() {
    if (!this.playing) return
    this.playing = false
    this.paused = true
    for (const anim of this.animations) anim.pause()
    this.notify()
  }

  toggle() {
    if (this.playing) this.pause()
    else this.play()
  }

  /** 单步：立即把下一个事件形变到终态，不启动协程 */
  stepForward() {
    if (this.cursor >= this.events.length) return
    this.jump(this.cursor + 1)
  }

  stepBack() {
    this.jump(this.cursor - 1)
  }

  /** 跳转到第 n 个事件已落地的状态：不重播，直接重建全部帧 */
  jump(target: number) {
    this.cancelToken()
    this.playing = false
    this.paused = false
    const c = Math.max(0, Math.min(this.events.length, Math.round(target)))
    this.cursor = c
    this.renderIndex = c - 1
    this.frame = c > 0 ? 1 : 0
    for (let k = 0; k < this.events.length; k++) {
      this.onFrame?.(this.events[k], k, k < c ? 1 : 0)
    }
    this.notify()
  }

  /** 跳到某一步：落在它的第一条消息上，步骤条与详情条才不会指向上一步 */
  seekStep(step: number) {
    const idx = this.events.findIndex((e) => e.step === step)
    if (idx >= 0) this.jump(idx + 1)
  }

  reset() {
    this.jump(0)
  }

  setSpeed(speed: PlayerSpeed) {
    if (!PLAYER_SPEEDS.includes(speed) || speed === this.speed) return
    this.speed = speed
    for (const anim of this.animations) anim.playbackRate = speed
    try {
      this.storage?.setItem(SPEED_STORAGE_KEY, String(speed))
    } catch {
      /* 隐私模式下 localStorage 不可写，不影响播放 */
    }
    this.notify()
  }

  cycleSpeed() {
    const i = PLAYER_SPEEDS.indexOf(this.speed)
    this.setSpeed(PLAYER_SPEEDS[(i + 1) % PLAYER_SPEEDS.length])
  }

  /** 图示自带节奏覆盖时（换到另一张图）动态更新，不必重建播放器 */
  setGaps(gaps: Partial<PlayerGaps> | undefined) {
    this.gaps = { ...DEFAULT_GAPS, ...gaps }
  }

  /** 注册 WAAPI 动画，使其与 rAF 时钟共享同一倍速与暂停语义 */
  track(animation: Animation) {
    if (this.disposed) return
    animation.playbackRate = this.speed
    if (!this.playing) animation.pause()
    this.animations.add(animation)
    void animation.finished
      .catch(() => undefined)
      .then(() => {
        this.animations.delete(animation)
      })
  }

  /** 数据源变化：重建游标并复位（老课时切换时不会残留上一张图的高亮） */
  setSource(events: readonly TimelineEvent<T>[], stepCount: number) {
    this.events = events
    this.stepCount = Math.max(stepCount, 0)
    this.jump(0)
  }

  dispose() {
    if (this.disposed) return
    this.cancelToken()
    this.disposed = true
    this.listeners.clear()
  }
}
