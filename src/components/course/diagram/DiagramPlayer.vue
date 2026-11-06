<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
  NetworkIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
} from '@lucide/vue'
import RichText from '@/components/course/RichText.vue'
import { useStepPlayer } from '@/composables/useStepPlayer'
import type { PlayablePayload, ProcessTimeline } from '@/lib/timeline'
import ProcessList from './ProcessList.vue'
import SequenceLanes from './SequenceLanes.vue'
import { STEP_CLASS, phaseOf, type ViewPhase } from './playerTokens'

/**
 * 四区联动的播放器：控制条 / 步骤条 / 列表或泳道 / 当前事件详情，
 * 全部从同一个游标派生。既服务 sequence，也服务 flow / layers / state / principle。
 *
 * 默认只露一枚「播放演示」按钮——一课里常有 3~4 张图，全展开控制条会把页面吵翻。
 * 未开始时静读态全量显示，不逼读者先点播放。
 */
const props = defineProps<{
  timeline: ProcessTimeline
  variant: 'sequence' | 'timeline'
}>()
const emit = defineEmits<{ complete: [] }>()

const events = computed(() => props.timeline.events.map((e) => e.payload))
const steps = computed(() => props.timeline.steps)
const hasLanes = computed(() => !!props.timeline.lanes)
const playable = computed(() => props.timeline.events.length >= 2)

const view = ref<'list' | 'lanes'>('list')
const expanded = ref(false)

const player = useStepPlayer<PlayablePayload>({
  events: () => props.timeline.events,
  stepCount: () => props.timeline.stepCount,
  gaps: () => props.timeline.gaps,
  onDone: () => emit('complete'),
})
const {
  playing, started, done, cursor, total, speed, activeStep, stepPhases, itemPhases,
  renderIndex, frame, progress,
  toggle, stepForward, stepBack, jump, seekStep, reset, cycleSpeed,
} = player

const phases = computed<ViewPhase[]>(() =>
  props.timeline.events.map((_, i) => phaseOf(i, started.value, itemPhases.value)),
)
const playLabel = computed(() =>
  playing.value ? '暂停' : done.value ? '重播' : started.value ? '继续' : '播放',
)
const currentPayload = computed(() => events.value[renderIndex.value] ?? null)
const currentStep = computed(() => steps.value[activeStep.value] ?? null)

function start() {
  expanded.value = true
  player.play()
}

/** 快捷键只在图示聚焦时生效；按钮上的空格交还按钮自己处理 */
function onKeydown(e: KeyboardEvent) {
  if (!playable.value) return
  const el = e.target as HTMLElement | null
  const inControl = !!el?.closest('button')
  switch (e.key) {
    case ' ':
      if (inControl) return
      e.preventDefault()
      if (!expanded.value) start()
      else toggle()
      break
    case 'ArrowRight':
      e.preventDefault()
      expanded.value = true
      stepForward()
      break
    case 'ArrowLeft':
      e.preventDefault()
      expanded.value = true
      stepBack()
      break
    case 'v':
    case 'V':
      if (hasLanes.value) view.value = view.value === 'list' ? 'lanes' : 'list'
      break
    case 'Escape':
      reset()
      break
    case 'Home':
      jump(0)
      break
    case 'End':
      jump(total.value)
      break
  }
}
</script>

<template>
  <div
    class="space-y-2 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
    :tabindex="playable ? 0 : undefined"
    :aria-label="playable ? '步进演示，可用空格播放暂停、左右键单步' : undefined"
    @keydown="onKeydown"
  >
    <!-- 折叠入口：静读时整张图就是一张普通图，不占版面 -->
    <div v-if="playable && !expanded" class="flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/[0.07] px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.13]"
        :aria-label="`播放演示，共 ${total} 步`"
        @click="start"
      >
        <PlayIcon class="size-3" />播放演示 · {{ total }} 步
      </button>
    </div>

    <!-- ① 控制条：展开后才出现 -->
    <template v-if="expanded && playable">
      <div class="flex flex-wrap items-center gap-1.5">
        <div
          v-if="hasLanes"
          class="inline-flex rounded-md border border-border/70 p-0.5"
          role="group"
          aria-label="演示视图"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors"
            :class="view === 'list' ? 'bg-primary/[0.09] text-primary' : 'text-muted-foreground hover:text-foreground'"
            :aria-pressed="view === 'list'"
            @click="view = 'list'"
          >
            <ListIcon class="size-3" />列表
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors"
            :class="view === 'lanes' ? 'bg-primary/[0.09] text-primary' : 'text-muted-foreground hover:text-foreground'"
            :aria-pressed="view === 'lanes'"
            @click="view = 'lanes'"
          >
            <NetworkIcon class="size-3" />泳道
          </button>
        </div>
        <span class="font-mono text-[11px] tabular-nums text-muted-foreground">
          <template v-if="steps.length">步骤 {{ started ? activeStep + 1 : '–' }}/{{ steps.length }} · </template>
          {{ cursor }}/{{ total }}
        </span>
        <span class="ml-auto flex flex-wrap items-center gap-1">
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-border/70 bg-card p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="上一步"
            :disabled="cursor === 0"
            @click="stepBack"
          >
            <ChevronLeftIcon class="size-3" />
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md border border-primary/35 bg-primary/[0.08] px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.14]"
            :aria-label="playLabel"
            @click="toggle"
          >
            <PauseIcon v-if="playing" class="size-3" />
            <PlayIcon v-else class="size-3" />
            {{ playLabel }}
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-border/70 bg-card p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="下一步"
            :disabled="cursor >= total"
            @click="stepForward"
          >
            <ChevronRightIcon class="size-3" />
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-border/70 bg-card p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="重置演示"
            @click="reset"
          >
            <RotateCcwIcon class="size-3" />
          </button>
          <button
            type="button"
            class="rounded-md border border-border/70 bg-card px-1.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-foreground"
            :aria-label="`播放速度 ${speed} 倍，点击切换`"
            @click="cycleSpeed"
          >
            {{ speed }}×
          </button>
        </span>
      </div>
      <div class="h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div class="h-full bg-primary/60" :style="{ width: progress + '%' }" />
      </div>
    </template>

    <!-- ② 步骤条：与事件流多对一，点任一步直接形变过去，不重播 -->
    <ol v-if="expanded && steps.length" class="flex flex-wrap gap-1">
      <li v-for="(s, i) in steps" :key="i">
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] leading-none transition-colors"
          :class="STEP_CLASS[stepPhases[i] ?? 'todo']"
          :aria-current="stepPhases[i] === 'active' ? 'step' : undefined"
          :aria-label="`跳到第 ${i + 1} 步：${s.title}`"
          @click="seekStep(i)"
        >
          <span class="font-mono tabular-nums opacity-70">{{ i + 1 }}</span>
          <span>{{ s.title }}</span>
        </button>
      </li>
    </ol>

    <!-- ③ 主画布：同一个游标，两种渲染层 -->
    <div class="rounded-lg border bg-card p-2">
      <SequenceLanes
        v-if="hasLanes && view === 'lanes'"
        :actors="timeline.lanes?.actors ?? []"
        :events="events"
        :phases="phases"
        :frame="frame"
        @jump="jump"
      />
      <ProcessList
        v-else
        :events="events"
        :phases="phases"
        :variant="props.variant"
        @jump="jump"
      />
      <p
        v-if="timeline.back"
        class="mt-2 flex items-center gap-1 text-[11px] leading-snug text-muted-foreground"
      >
        <RotateCcwIcon class="size-2.5 shrink-0" />
        回退 {{ timeline.back.from }} → {{ timeline.back.to }}:<RichText :text="timeline.back.label" />
      </p>
    </div>

    <!-- ④ 当前事件详情：叙事步骤 + 事件正文，随游标一起跳 -->
    <div v-if="expanded && playable" class="rounded-lg border bg-muted/30 px-3 py-2">
      <div class="flex flex-wrap items-baseline gap-x-2 text-[11px]">
        <span class="font-medium" :class="currentStep ? 'text-primary' : 'text-muted-foreground'">
          {{ currentStep ? `第 ${activeStep + 1} 步 · ${currentStep.title}` : done ? '演示完成' : '准备就绪' }}
        </span>
        <span v-if="currentStep?.detail" class="min-w-0 text-muted-foreground">
          {{ currentStep.detail }}
        </span>
      </div>
      <p v-if="currentPayload" class="mt-1 text-xs leading-snug text-foreground/85">
        <span class="font-mono text-[11px] text-muted-foreground">
          {{ currentPayload.no }}<template v-if="props.variant === 'sequence'">. {{ currentPayload.from }} → {{ currentPayload.to }}：</template><template v-else>. </template>
        </span>
        <RichText :text="currentPayload.label" />
      </p>
      <p v-else class="mt-1 text-xs leading-snug text-muted-foreground">
        全部 {{ total }} {{ props.variant === 'sequence' ? '条消息' : '步' }}已展开，可直接通读；点「播放」按教学步骤逐条推进。
      </p>
    </div>
    <p
      v-if="expanded && playable"
      class="hidden text-[11px] leading-snug text-muted-foreground/70 lg:block"
    >
      快捷键：空格 播放/暂停 · ← → 单步<template v-if="hasLanes"> · V 切换视图</template> · Esc 重置
    </p>
  </div>
</template>

<style scoped>
/* 播放时只改 opacity，不做位移：整列不「抖」才看得清先后。 */
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
  }
}
</style>
