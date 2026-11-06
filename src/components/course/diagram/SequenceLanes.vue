<script setup lang="ts">
import { computed } from 'vue'
import { shortLabel } from '@/lib/sequenceTimeline'
import type { PlayablePayload } from '@/lib/timeline'
import { TAG_TEXT, type ViewPhase } from './playerTokens'

/** 泳道视图：生命线 + 由 from/to 下标推导方向的箭头，rAF 进度直接写 dashoffset */
const props = defineProps<{
  actors: string[]
  events: PlayablePayload[]
  phases: ViewPhase[]
  frame: number
}>()
const emit = defineEmits<{ jump: [n: number] }>()

const LANE_ROW_H = 30
const actorCount = computed(() => props.actors.length)
const laneWidth = computed(() => Math.max(460, actorCount.value * 132))
const laneHeight = computed(() => 46 + props.events.length * LANE_ROW_H + 14)

function laneX(i: number) {
  const pad = 46
  const n = Math.max(2, actorCount.value)
  return pad + (i * (laneWidth.value - pad * 2)) / (n - 1)
}
function laneY(i: number) {
  return 46 + i * LANE_ROW_H
}
function ends(i: number) {
  const p = props.events[i]
  return { x1: laneX(p.fromIdx ?? 0), x2: laneX(p.toIdx ?? 0), y: laneY(i) }
}
function lanePath(i: number) {
  const { x1, x2, y } = ends(i)
  if (x1 === x2) return `M ${x1} ${y - 5} h 18 a 5 5 0 0 1 0 10 h -18`
  const d = x2 > x1 ? 1 : -1
  return `M ${x1 + d * 5} ${y} L ${x2 - d * 5} ${y}`
}
function laneTip(i: number) {
  const { x1, x2, y } = ends(i)
  if (x1 === x2) return `M ${x1 + 6} ${y} L ${x1} ${y + 5} L ${x1 + 6} ${y + 10}`
  const d = x2 > x1 ? 1 : -1
  const tx = x2 - d * 5
  return `M ${tx - d * 6} ${y - 4} L ${tx} ${y} L ${tx - d * 6} ${y + 4}`
}
function laneLabelX(i: number) {
  const { x1, x2 } = ends(i)
  return x1 === x2 ? x1 + 30 : (x1 + x2) / 2
}
function laneDash(i: number) {
  const p = props.phases[i] ?? 'idle'
  if (p === 'future') return 100
  if (p === 'current') return 100 * (1 - Math.max(0.02, props.frame))
  return 0
}
function laneGroupClass(i: number) {
  const p = props.phases[i] ?? 'idle'
  const opacity =
    p === 'future' ? 'opacity-25' : p === 'past' ? 'opacity-75' : p === 'current' ? 'opacity-100' : 'opacity-55'
  return [TAG_TEXT[props.events[i].tag], opacity]
}
</script>

<template>
  <div class="overflow-x-auto">
    <svg
      class="block font-mono"
      :width="laneWidth"
      :height="laneHeight"
      :viewBox="`0 0 ${laneWidth} ${laneHeight}`"
      role="img"
      aria-label="消息泳道图，点击任一箭头可跳到该消息"
    >
      <line
        v-for="i in actorCount"
        :key="`life-${i}`"
        :x1="laneX(i - 1)" :x2="laneX(i - 1)" y1="28" :y2="laneHeight - 8"
        stroke="currentColor" stroke-width="1" stroke-dasharray="3 4"
        class="text-muted-foreground/40"
      />
      <text
        v-for="(a, i) in props.actors"
        :key="`head-${i}`"
        :x="laneX(i)" y="19" text-anchor="middle" font-size="10" fill="currentColor"
        class="font-medium text-foreground"
      >
        {{ shortLabel(a, 14) }}
      </text>
      <g
        v-for="(p, i) in props.events"
        :key="`msg-${i}`"
        class="cursor-pointer transition-opacity duration-200"
        :class="laneGroupClass(i)"
        @click="emit('jump', p.no)"
      >
        <title>{{ p.no }}. {{ p.from }} → {{ p.to }}：{{ shortLabel(p.label, 60) }}</title>
        <path
          :d="lanePath(i)" fill="none" stroke="currentColor" stroke-width="1"
          class="opacity-25" :stroke-dasharray="p.reply ? '3 3' : undefined"
        />
        <path
          :d="lanePath(i)" fill="none" stroke="currentColor" stroke-width="1.6"
          stroke-linecap="round" pathLength="100" stroke-dasharray="100"
          :stroke-dashoffset="laneDash(i)"
        />
        <path
          v-if="(props.phases[i] ?? 'idle') !== 'future'"
          :d="laneTip(i)" fill="none" stroke="currentColor" stroke-width="1.4"
          stroke-linecap="round" stroke-linejoin="round"
          :opacity="props.phases[i] === 'current' ? Math.min(1, props.frame * 1.6) : 1"
        />
        <text
          :x="laneLabelX(i)" :y="laneY(i) - 6" text-anchor="middle" font-size="9"
          fill="currentColor"
        >
          {{ p.no }} · {{ shortLabel(p.label, 12) }}
        </text>
      </g>
    </svg>
  </div>
</template>
