import { computed, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  StepPlayer,
  type PlayerGaps,
  type PlayerSpeed,
  type PlayerState,
  type TimelineEvent,
} from '@/lib/stepPlayer'

export interface UseStepPlayerOptions<T> {
  /** 事件流（可用 computed / getter，源变化自动重建播放器） */
  events: MaybeRefOrGetter<readonly TimelineEvent<T>[]>
  stepCount: MaybeRefOrGetter<number>
  gaps?: MaybeRefOrGetter<Partial<PlayerGaps> | undefined>
  /** 可直接写 DOM 的逐帧钩子；一般不用，模板里读 frame 即可 */
  onFrame?: (event: TimelineEvent<T>, index: number, progress: number) => void
  /** 自然播放到结尾（jump / reset 不触发） */
  onDone?: () => void
}

function safeStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * Vue 绑定层：只做响应式桥接，状态机全在 StepPlayer 里。
 * 组件拿到的是只读的派生状态与一组动作，不接触游标本身。
 */
export function useStepPlayer<T>(options: UseStepPlayerOptions<T>) {
  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const player = new StepPlayer<T>({
    events: () => toValue(options.events),
    stepCount: () => toValue(options.stepCount),
    gaps: toValue(options.gaps),
    reducedMotion,
    storage: safeStorage(),
    onFrame: options.onFrame,
    onDone: options.onDone,
  })

  const state = shallowRef<PlayerState>(player.getState())
  const unsubscribe = player.subscribe((s) => {
    state.value = s
  })

  watch(
    [() => toValue(options.events), () => toValue(options.stepCount)],
    () => player.setSource(toValue(options.events), toValue(options.stepCount)),
  )

  if (options.gaps !== undefined) {
    watch(() => toValue(options.gaps), (g) => player.setGaps(g))
  }

  onScopeDispose(() => {
    unsubscribe()
    player.dispose()
  })

  const playing = computed(() => state.value.playing)
  const started = computed(() => state.value.started)
  const done = computed(() => state.value.done)
  const cursor = computed(() => state.value.cursor)
  const total = computed(() => state.value.total)
  const speed = computed(() => state.value.speed)
  const activeStep = computed(() => state.value.activeStep)
  const stepPhases = computed(() => state.value.stepPhases)
  const itemPhases = computed(() => state.value.itemPhases)
  const renderIndex = computed(() => state.value.renderIndex)
  const frame = computed(() => state.value.frame)
  const progress = computed(() => (total.value ? Math.round((cursor.value / total.value) * 100) : 0))

  return {
    state,
    playing,
    started,
    done,
    cursor,
    total,
    speed,
    activeStep,
    stepPhases,
    itemPhases,
    renderIndex,
    frame,
    progress,
    play: () => player.play(),
    pause: () => player.pause(),
    toggle: () => player.toggle(),
    stepForward: () => player.stepForward(),
    stepBack: () => player.stepBack(),
    jump: (n: number) => player.jump(n),
    seekStep: (s: number) => player.seekStep(s),
    reset: () => player.reset(),
    setSpeed: (s: PlayerSpeed) => player.setSpeed(s),
    cycleSpeed: () => player.cycleSpeed(),
    track: (a: Animation) => player.track(a),
  }
}
