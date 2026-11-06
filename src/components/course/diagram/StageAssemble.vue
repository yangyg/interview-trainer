<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { NetworkIcon, PlayIcon, RotateCcwIcon } from '@lucide/vue'
import RichText from '@/components/course/RichText.vue'
import StageGlyph from './StageGlyph.vue'
import { stageLinks, type StageLink, type StageRect } from '@/lib/stageAssemble'
import type { PrincipleStep } from '@/lib/types'

/**
 * 另一种演示：分解 → 连接 → 令牌沿链扫过。
 *
 * 与步进播放的区别不是皮肤，而是机制：播放器是一条事件流 + 单一游标 + 三态高亮；
 * 这里是 N 张空间上独立的阶段卡，先各自成立，再按 i→i+1 逐段绘出链路。
 * 没有 rAF 虚拟时钟、没有倍速、没有 past/current/future，也不复用 stepPlayer。
 *
 * 默认「拆解态」是纯静态的（零动画、零定时器），一课多图时不会吵闹。
 */
const props = withDefaults(
  defineProps<{ steps: PrincipleStep[]; textMode?: 'visual' | 'text' }>(),
  { textMode: 'visual' },
)

const n = computed(() => props.steps.length)
type Phase = 'split' | 'linked' | 'running' | 'done'
const phase = ref<Phase>('split')
/** -1 = 没有令牌；0..n-1 = 令牌停在第几个阶段 */
const active = ref(-1)
const selected = ref<number | null>(null)
const connected = computed(() => phase.value !== 'split')
const reduced = ref(false)

// ---------- 测量：把 DOM 矩形交给纯函数算连线 ----------
const canvas = ref<HTMLElement | null>(null)
let cardEls: HTMLElement[] = []
const links = shallowRef<StageLink[]>([])
const size = ref({ w: 0, h: 0 })
const centers = ref<{ x: number; top: number }[]>([])

function setCard(el: unknown, i: number) {
  if (el instanceof HTMLElement) cardEls[i] = el
}

function measure() {
  const host = canvas.value
  if (!host) return
  const r = host.getBoundingClientRect()
  const rects: StageRect[] = []
  const cs: { x: number; top: number }[] = []
  for (let i = 0; i < n.value; i++) {
    const el = cardEls[i]
    if (!el) return
    const cr = el.getBoundingClientRect()
    const left = cr.left - r.left
    const top = cr.top - r.top
    rects.push({
      left,
      right: cr.right - r.left,
      top,
      bottom: cr.bottom - r.top,
      cx: left + cr.width / 2,
      cy: top + cr.height / 2,
    })
    cs.push({ x: left + cr.width / 2, top })
  }
  links.value = stageLinks(rects)
  centers.value = cs
  size.value = { w: r.width, h: r.height }
}

let ro: ResizeObserver | null = null
onMounted(() => {
  reduced.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  measure()
  requestAnimationFrame(measure)
  if (canvas.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(measure)
    ro.observe(canvas.value)
  }
  window.addEventListener('resize', measure)
})

// ---------- 三态切换 ----------
let timer: number | null = null
function stopRun() {
  if (timer != null) {
    window.clearInterval(timer)
    timer = null
  }
}
function reset() {
  stopRun()
  phase.value = 'split'
  active.value = -1
  selected.value = null
}
function connect() {
  stopRun()
  phase.value = 'linked'
  active.value = -1
}
function run() {
  stopRun()
  if (phase.value === 'split') phase.value = 'linked'
  if (reduced.value) {
    phase.value = 'done'
    active.value = n.value - 1
    return
  }
  phase.value = 'running'
  active.value = 0
  timer = window.setInterval(() => {
    if (active.value >= n.value - 1) {
      stopRun()
      phase.value = 'done'
      return
    }
    active.value += 1
  }, 720)
}
function select(i: number) {
  selected.value = selected.value === i ? null : i
}

onBeforeUnmount(() => {
  stopRun()
  ro?.disconnect()
  window.removeEventListener('resize', measure)
})

// ---------- 视觉编码 ----------
const TONE_DOT: Record<string, string> = {
  primary: 'bg-primary/15 text-primary',
  warn: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  muted: 'bg-muted text-muted-foreground',
  bad: 'bg-red-500/15 text-red-600 dark:text-red-400',
}
function toneDot(i: number) {
  const tone = props.steps[i]?.visual?.tone
  if (tone) return TONE_DOT[tone]
  return connected.value || active.value === i
    ? 'bg-primary/15 text-primary'
    : 'bg-muted text-muted-foreground'
}
function cardClass(i: number) {
  const base =
    'relative z-10 flex flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-[border-color,background-color,box-shadow] duration-300'
  if (active.value === i) return `${base} border-primary/55 bg-primary/[0.07] shadow-sm`
  if (selected.value === i) return `${base} border-primary/35 bg-card ring-1 ring-ring/30`
  if (connected.value) return `${base} border-border/80 bg-card`
  return `${base} border-dashed border-border/70 bg-card`
}
function linkClass(i: number) {
  if (!connected.value) return 'text-muted-foreground/30'
  if (active.value > i) return 'text-primary'
  return 'text-muted-foreground/55'
}
function arrowTransform(l: StageLink) {
  return `translate(${l.arrow.x} ${l.arrow.y}) rotate(${l.arrow.dir === 'down' ? 90 : 0})`
}
const tokenStyle = computed(() => {
  const c = centers.value[active.value]
  if (active.value < 0 || !c) return { transform: 'translate(-40px, -40px)' }
  return { transform: `translate(${c.x}px, ${c.top - 7}px)` }
})
const status = computed(() => {
  switch (phase.value) {
    case 'split':
      return `${n.value} 个阶段各自独立 · 先看清每段做了什么`
    case 'linked':
      return '已连成一条链 · 上一阶段的产物是下一阶段的输入'
    case 'running':
      return `第 ${active.value + 1}/${n.value} 阶段 · 令牌正在沿链前移`
    default:
      return '链路跑完 · 点任一阶段回看它做了什么'
  }
})
const detail = computed(() => {
  const i = selected.value ?? (active.value >= 0 ? active.value : null)
  if (i == null || !props.steps[i]) return null
  return { no: i + 1, step: props.steps[i] }
})
</script>

<template>
  <div class="space-y-2">
    <!-- 工具条：只有三个动作，不铺控制条 -->
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span class="text-[11px] leading-5 text-muted-foreground">{{ status }}</span>
      <span class="ml-auto flex items-center gap-1">
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/[0.07] px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.13] disabled:pointer-events-none disabled:opacity-40"
          :disabled="connected"
          aria-label="连接六个阶段"
          @click="connect"
        >
          <NetworkIcon class="size-3" />连接{{ n }}个阶段
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-2 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          :disabled="phase === 'running'"
          aria-label="沿链路跑一遍"
          @click="run"
        >
          <PlayIcon class="size-3" />跑一遍
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-md border border-border/70 bg-card p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          :disabled="phase === 'split'"
          aria-label="断开并重置演示"
          @click="reset"
        >
          <RotateCcwIcon class="size-3" />
        </button>
      </span>
    </div>

    <!-- 画布：卡片是主体，连线层在它们下面走空隙 -->
    <div ref="canvas" class="relative rounded-lg border bg-card p-2 sm:p-3">
      <svg
        v-if="size.w > 0"
        class="pointer-events-none absolute inset-0 z-0"
        :width="size.w"
        :height="size.h"
        :viewBox="`0 0 ${size.w} ${size.h}`"
        aria-hidden="true"
      >
        <g v-for="(l, i) in links" :key="i" :class="linkClass(i)">
          <path
            :d="l.d"
            class="stage-link"
            :stroke-dasharray="l.length"
            :style="{
              strokeDashoffset: connected ? '0' : String(l.length),
              transitionDelay: `${i * 140}ms`,
            }"
          />
          <path
            d="M -4 -3 L 2 0 L -4 3 Z"
            :transform="arrowTransform(l)"
            class="stage-arrow"
            :style="{ opacity: connected ? 1 : 0, transitionDelay: `${i * 140 + 260}ms` }"
          />
        </g>
        <g :style="tokenStyle" class="stage-token" :class="active < 0 ? 'opacity-0' : 'opacity-100'">
          <circle r="7" class="fill-primary/20 stroke-primary" stroke-width="1.5" />
          <circle r="2.5" class="fill-primary" stroke="none" />
        </g>
      </svg>

      <div class="relative grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-7 sm:gap-y-9">
        <button
          v-for="(s, i) in steps"
          :key="i"
          type="button"
          :ref="(el) => setCard(el, i)"
          :class="cardClass(i)"
          :aria-pressed="selected === i"
          :aria-label="`第 ${i + 1} 阶段：${s.title}`"
          @click="select(i)"
        >
          <span class="flex items-start gap-1.5">
            <span
              class="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
              :class="toneDot(i)"
            >
              {{ i + 1 }}
            </span>
            <span class="min-w-0 text-[11px] font-medium leading-snug">
              <RichText :text="s.title" />
            </span>
          </span>
          <StageGlyph :kind="s.visual!.kind" />
          <span
            class="flex min-w-0 items-center gap-1 rounded bg-muted/50 px-1.5 py-1 font-mono text-[10px] leading-4"
          >
            <span class="min-w-0 truncate">{{ s.visual!.input }}</span>
            <span class="shrink-0 text-primary">→</span>
            <span class="min-w-0 truncate">{{ s.visual!.output }}</span>
          </span>
          <span v-if="s.visual!.hint" class="text-[10px] leading-snug text-muted-foreground">
            {{ s.visual!.hint }}
          </span>
        </button>
      </div>
    </div>

    <!-- 选中 / 令牌所在阶段的详解；文字始终在 DOM 里 -->
    <div class="rounded-lg border bg-muted/30 px-3 py-2">
      <template v-if="detail">
        <p class="text-[11px] font-medium text-primary">
          第 {{ detail.no }} 阶段 · {{ detail.step.title }}
        </p>
        <p class="mt-1 text-xs leading-snug text-foreground/85">
          <RichText :text="detail.step.detail" />
        </p>
      </template>
      <p v-else class="text-xs leading-snug text-muted-foreground">
        点任一阶段看它做了什么；先「连接」再看产物如何一路传下去，或直接「跑一遍」。
      </p>
    </div>

    <!-- 图解优先：六个阶段的详解不删，收进原生 details；全文精读时自动展开 -->
    <details
      :open="textMode === 'text'"
      class="rounded-lg border border-border/60 px-3 py-2"
    >
      <summary class="cursor-pointer text-[11px] leading-5 text-muted-foreground">
        展开六个阶段的完整文字（{{ n }} 段）
      </summary>
      <ol class="mt-2 space-y-1.5">
        <li v-for="(s, i) in steps" :key="i" class="text-xs leading-snug text-foreground/85">
          <span class="font-medium">{{ i + 1 }}. {{ s.title }}</span>
          <span class="text-muted-foreground"> — </span>
          <RichText :text="s.detail" />
        </li>
      </ol>
    </details>
  </div>
</template>

<style scoped>
.stage-link {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  transition: stroke-dashoffset 0.45s ease, stroke 0.25s ease;
}
.stage-arrow {
  fill: currentColor;
  stroke: none;
  transition: opacity 0.25s ease;
}
.stage-token {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}
@media (prefers-reduced-motion: reduce) {
  .stage-link,
  .stage-arrow,
  .stage-token {
    transition-duration: 0.01ms !important;
  }
}
</style>
