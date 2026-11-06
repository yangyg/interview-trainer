<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRightIcon, CornerDownRightIcon, UndoIcon } from '@lucide/vue'
import RichText from '@/components/course/RichText.vue'
import ContainBox from './ContainBox.vue'
import type { DiagramSpec, TreeNode } from '@/lib/types'

/** 没有时间序（或不足两步）的图示：保持原来的静态快照渲染 */
const props = defineProps<{ diagram: DiagramSpec }>()

interface FlatNode {
  label: string
  note?: string
  depth: number
  last: boolean
  tone?: 'primary' | 'warn' | 'bad'
}

const flatTree = computed<FlatNode[]>(() => {
  if (props.diagram.type !== 'tree') return []
  const out: FlatNode[] = []
  const walk = (node: TreeNode, depth: number, last: boolean) => {
    out.push({ label: node.label, note: node.note, depth, last, tone: node.tone })
    const kids = node.children ?? []
    kids.forEach((k, i) => walk(k, depth + 1, i === kids.length - 1))
  }
  walk(props.diagram.root, 0, true)
  return out
})

/** scale 用对数比例：线性会让 2 万和 500 万挤成同一长度 */
const scaleMax = computed(() => {
  if (props.diagram.type !== 'scale') return 1
  return Math.max(...props.diagram.items.map((i) => i.value), 1)
})
const barWidth = (v: number) => {
  const ratio = Math.log10(Math.max(1, v) + 1) / Math.log10(scaleMax.value + 1)
  return `${Math.max(4, Math.round(ratio * 100))}%`
}

const TONE_BOX = {
  primary: 'border-primary/30 bg-primary/[0.07]',
  warn: 'border-amber-500/35 bg-amber-500/[0.07]',
  muted: 'border-border/70 bg-muted/40',
} as const

/** matrix：head 比 cols 多一列时，第一列是行标签表头 */
const rowHead = computed(() => {
  const d = props.diagram
  if (d.type !== 'matrix') return ''
  return d.head && d.head.length === d.cols.length + 1 ? d.head[0] : ''
})

const SPLIT_TONE = {
  bad: 'border-rose-500/30 bg-rose-500/[0.06]',
  warn: 'border-amber-500/30 bg-amber-500/[0.06]',
  good: 'border-emerald-500/30 bg-emerald-500/[0.06]',
  neutral: 'border-border/70 bg-muted/35',
} as const

const backIdx = computed(() => {
  if (props.diagram.type !== 'state' || !props.diagram.back) return new Set<number>()
  const { from, to } = props.diagram.back
  return new Set([from, to])
})

const stateItems = computed<{ label: string; note?: string; tone?: 'primary' | 'muted' }[]>(() => {
  if (props.diagram.type !== 'state') return []
  return props.diagram.states.map((s) => (typeof s === 'string' ? { label: s } : s))
})
</script>

<template>
  <!-- flow -->
  <div
    v-if="diagram.type === 'flow'"
    class="flex flex-col gap-1.5"
    :class="diagram.direction === 'v' ? '' : 'sm:flex-row sm:items-stretch sm:gap-1'"
  >
    <template v-for="(item, i) in diagram.items" :key="i">
      <div
        class="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 sm:flex-col sm:justify-center sm:gap-1 sm:px-2 sm:py-3 sm:text-center"
      >
        <span
          v-if="diagram.direction !== 'v'"
          class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold tabular-nums text-primary sm:mb-0.5"
        >
          {{ i + 1 }}
        </span>
        <span class="min-w-0 text-xs font-medium leading-snug"><RichText :text="item.label" /></span>
        <span v-if="item.note" class="min-w-0 text-xs leading-snug text-muted-foreground">
          <RichText :text="item.note" />
        </span>
      </div>
      <div
        v-if="i < diagram.items.length - 1"
        class="flex shrink-0 items-center justify-center text-muted-foreground/60"
        :class="diagram.direction === 'v' ? 'h-3' : 'h-3 sm:h-auto sm:w-3'"
      >
        <ChevronRightIcon
          class="size-3"
          :class="diagram.direction === 'v' ? 'rotate-90' : 'rotate-90 sm:rotate-0'"
        />
      </div>
    </template>
  </div>

  <!-- layers -->
  <div v-else-if="diagram.type === 'layers'" class="space-y-1">
    <div
      v-for="(item, i) in diagram.items"
      :key="i"
      class="flex items-start gap-2.5 rounded-md border px-3 py-2"
      :class="item.tone === 'primary' ? 'border-primary/25 bg-primary/[0.07]' : 'border-border/70 bg-muted/35'"
    >
      <span class="min-w-0 flex-1 text-xs font-medium leading-snug"><RichText :text="item.label" /></span>
      <span v-if="item.note" class="min-w-0 flex-[1.4] text-right text-xs leading-snug text-muted-foreground">
        <RichText :text="item.note" />
      </span>
    </div>
  </div>

  <!-- contain:静态嵌套包含,集合关系没有时间先后,绝不接播放器 -->
  <div v-else-if="diagram.type === 'contain'" class="space-y-2">
    <ContainBox :items="diagram.items" />
    <div
      v-if="diagram.base"
      class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2"
    >
      <span class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        外部承载 · 不在包含链内
      </span>
      <span class="text-xs font-medium"><RichText :text="diagram.base.label" /></span>
      <span v-if="diagram.base.note" class="text-[11px] leading-snug text-muted-foreground">
        <RichText :text="diagram.base.note" />
      </span>
    </div>
  </div>

  <!-- tree -->
  <div v-else-if="diagram.type === 'tree'" class="space-y-1">
    <div
      v-for="(node, i) in flatTree"
      :key="i"
      class="flex items-start gap-1.5 text-xs leading-snug"
      :style="{ paddingLeft: `${node.depth * 14}px` }"
    >
      <CornerDownRightIcon v-if="node.depth > 0" class="mt-0.5 size-3 shrink-0 text-muted-foreground/50" />
      <span
        class="shrink-0 font-medium"
        :class="
          node.tone === 'bad'
            ? 'text-rose-600 dark:text-rose-400'
            : node.tone === 'warn'
              ? 'text-amber-600 dark:text-amber-400'
              : node.tone === 'primary' || node.depth === 0
                ? 'text-primary'
                : ''
        "
      >
        <RichText :text="node.label" />
      </span>
      <span v-if="node.note" class="min-w-0 text-muted-foreground">— <RichText :text="node.note" /></span>
    </div>
  </div>

  <!-- matrix -->
  <div v-else-if="diagram.type === 'matrix'">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-left text-xs" :style="{ minWidth: `${(diagram.cols.length + 1) * 104}px` }">
        <thead>
          <tr>
            <th class="border-b border-border/70 px-2 py-1.5 font-medium text-muted-foreground">
              <RichText :text="rowHead" />
            </th>
            <th
              v-for="(c, i) in diagram.cols"
              :key="i"
              class="border-b border-border/70 px-2 py-1.5 text-center font-medium text-muted-foreground"
            >
              <RichText :text="c" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in diagram.rows" :key="ri">
            <th class="whitespace-nowrap border-b border-border/40 px-2 py-1.5 text-left font-medium">
              <RichText :text="row[0]" />
            </th>
            <td
              v-for="(cell, ci) in row.slice(1)"
              :key="ci"
              class="border-b border-border/40 px-2 py-1.5 text-center align-top text-muted-foreground"
            >
              <RichText :text="cell" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-1.5 text-xs text-muted-foreground sm:hidden">← 左右滑动看完整表格 →</p>
  </div>

  <!-- memory -->
  <div
    v-else-if="diagram.type === 'memory'"
    class="grid items-stretch gap-2 sm:grid-cols-[repeat(auto-fit,minmax(230px,1fr))]"
  >
    <div
      v-for="(region, ri) in diagram.regions"
      :key="ri"
      class="flex min-w-0 flex-col overflow-hidden rounded-lg border"
      :class="TONE_BOX[region.tone ?? 'muted']"
    >
      <div class="border-b border-border/50 px-2 py-1">
        <p class="text-[11px] font-semibold leading-tight"><RichText :text="region.name" /></p>
        <p v-if="region.note" class="mt-0.5 text-xs leading-tight text-muted-foreground">
          <RichText :text="region.note" />
        </p>
      </div>
      <div class="flex-1 space-y-1 p-1.5">
        <div
          v-for="(slot, si) in region.slots"
          :key="si"
          class="rounded border bg-card px-2 py-1.5"
          :class="
            slot.tone === 'primary'
              ? 'border-primary/40'
              : slot.tone === 'warn'
                ? 'border-amber-500/40'
                : 'border-border/60'
          "
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="min-w-0 truncate font-mono text-[11px] font-medium leading-tight">
              <RichText :text="slot.label" />
            </span>
            <span
              v-if="slot.value"
              class="min-w-0 shrink text-right font-mono text-[11px] leading-tight text-muted-foreground [overflow-wrap:anywhere]"
            >
              <RichText :text="slot.value" />
            </span>
          </div>
          <p v-if="slot.ref" class="mt-1 flex items-center gap-0.5 text-[11px] leading-tight text-primary">
            <CornerDownRightIcon class="size-2.5 shrink-0" />
            指向 <RichText :text="slot.ref" />
          </p>
        </div>
        <p v-if="!region.slots.length" class="px-1 py-1 text-[11px] text-muted-foreground">—</p>
      </div>
    </div>
  </div>

  <!-- split -->
  <div v-else-if="diagram.type === 'split'" class="grid gap-2 sm:grid-cols-2">
    <div
      v-for="(side, si) in [diagram.left, diagram.right]"
      :key="si"
      class="min-w-0 rounded-lg border p-2.5"
      :class="SPLIT_TONE[side.tone ?? 'neutral']"
    >
      <p class="text-[11px] font-semibold leading-tight"><RichText :text="side.title" /></p>
      <ul class="mt-1.5 space-y-1">
        <li
          v-for="(it, i) in side.items"
          :key="i"
          class="flex gap-1.5 text-[11px] leading-snug text-foreground/80"
        >
          <span class="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-40" />
          <span class="min-w-0"><RichText :text="it" /></span>
        </li>
      </ul>
    </div>
  </div>

  <!-- scale -->
  <div v-else-if="diagram.type === 'scale'" class="space-y-1.5">
    <div v-for="(it, i) in diagram.items" :key="i" class="flex items-center gap-2">
      <span class="w-24 shrink-0 text-[11px] leading-tight sm:w-40" :title="it.label">
        <RichText :text="it.label" />
      </span>
      <div class="h-3.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/60">
        <div class="h-full rounded-sm bg-primary/45" :style="{ width: barWidth(it.value) }" />
      </div>
      <span class="w-[4.5rem] shrink-0 text-right font-mono text-[11px] text-muted-foreground">
        <RichText :text="it.display" />
      </span>
    </div>
    <div
      v-if="diagram.items.some((i) => i.note)"
      class="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs leading-snug text-muted-foreground"
    >
      <span v-for="(it, i) in diagram.items.filter((x) => x.note)" :key="i" class="whitespace-nowrap">
        <RichText :text="it.label" /> — <RichText :text="it.note" />
      </span>
    </div>
  </div>

  <!-- state -->
  <div v-else-if="diagram.type === 'state'" class="flex flex-wrap items-center gap-x-1 gap-y-2">
    <template v-for="(s, i) in stateItems" :key="i">
      <div
        class="rounded-md border px-2.5 py-1.5"
        :class="s.tone === 'primary' ? 'border-primary/35 bg-primary/[0.08]' : 'border-border/70 bg-muted/40'"
      >
        <p class="flex items-center gap-1 text-[11px] font-medium leading-tight">
          <RichText :text="s.label" />
          <span
            v-if="backIdx.has(i + 1)"
            class="rounded bg-foreground/10 px-1 font-mono text-[11px] leading-tight text-foreground/70"
          >
            {{ i + 1 }}
          </span>
        </p>
        <p v-if="s.note" class="mt-0.5 text-xs leading-tight text-muted-foreground">
          <RichText :text="s.note" />
        </p>
      </div>
      <div v-if="i < stateItems.length - 1" class="flex min-w-8 flex-col items-center text-muted-foreground">
        <span class="max-w-36 px-0.5 text-center text-xs leading-tight">
          <RichText v-if="diagram.transitions?.[i]" :text="diagram.transitions[i]" />
        </span>
        <ChevronRightIcon class="size-3" />
      </div>
    </template>
    <p v-if="diagram.back" class="mt-1 flex w-full items-center gap-1 text-[11px] leading-snug text-muted-foreground">
      <UndoIcon class="size-2.5 shrink-0" />
      回退 {{ diagram.back.from }} → {{ diagram.back.to }}:<RichText :text="diagram.back.label" />
    </p>
  </div>
</template>
