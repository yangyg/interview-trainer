<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { ChevronRightIcon, CornerDownRightIcon, PauseIcon, PlayIcon, RefreshCcwIcon, UndoIcon } from '@lucide/vue'
import RichText from '@/components/course/RichText.vue'
import type { DiagramSpec, TreeNode } from '@/lib/types'

const props = defineProps<{ diagram: DiagramSpec }>()

interface FlatNode {
  label: string
  note?: string
  depth: number
  last: boolean
  tone?: 'primary' | 'warn' | 'bad'
}

/** 树扁化成带缩进的列表:避免递归组件,渲染层只处理一维数组 */
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

const caption = computed(() => {
  const d = props.diagram
  return 'caption' in d ? d.caption : undefined
})

/** scale:按数量级映射宽度。线性比例会让 2 万和 500 万挤成同一长度,对数才看得出跨量级差异 */
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

/** matrix:head 若比 cols 多一列,第一列即行标签的表头;否则留空 */
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

/** state:回退边涉及的序号,用于给状态点加标记 */
const backIdx = computed(() => {
  if (props.diagram.type !== 'state' || !props.diagram.back) return new Set<number>()
  const { from, to } = props.diagram.back
  return new Set([from, to])
})

/** state:作者可以只写字符串,这里统一成对象,避免模板里到处判类型 */
const stateItems = computed<{ label: string; note?: string; tone?: 'primary' | 'muted' }[]>(() => {
  if (props.diagram.type !== 'state') return []
  return props.diagram.states.map((s) => (typeof s === 'string' ? { label: s } : s))
})

/* ── sequence 逐条播放 ─────────────────────────────────────────────
   时序图的全部信息都在「先后顺序」上，但静态渲染会把它压成一列清单，
   读者得自己在脑子里时间旅行。加一个播放键，让消息一条条落下来。
   默认仍是全量显示：老课时不点播放也能照常读。 */
const seqTotal = computed(() =>
  props.diagram.type === 'sequence' ? props.diagram.messages.length : 0,
)
/** 已显示的条数；Infinity 表示「全部显示」（初始态） */
const seqShown = ref(Number.POSITIVE_INFINITY)
const seqPlaying = ref(false)
let seqTimer: ReturnType<typeof setTimeout> | undefined

function stopSeq() {
  if (seqTimer) {
    clearTimeout(seqTimer)
    seqTimer = undefined
  }
  seqPlaying.value = false
}

function stepSeq() {
  seqTimer = setTimeout(() => {
    seqShown.value = Math.min(seqShown.value + 1, seqTotal.value)
    if (seqShown.value >= seqTotal.value) seqPlaying.value = false
    else stepSeq()
  }, 950)
}

function playSeq() {
  stopSeq()
  seqShown.value = 0
  seqPlaying.value = true
  stepSeq()
}

function resetSeq() {
  stopSeq()
  seqShown.value = Number.POSITIVE_INFINITY
}

/** 当前需要渲染的消息：Infinity 时全量，否则只渲染前 N 条（新增的会走入场过渡） */
const seqMessages = computed(() => {
  if (props.diagram.type !== 'sequence') return []
  const all = props.diagram.messages
  return seqShown.value === Number.POSITIVE_INFINITY ? all : all.slice(0, seqShown.value)
})

onUnmounted(stopSeq)
</script>

<template>
  <figure class="not-prose">
    <!-- flow:横向在桌面展开,窄屏自动降级为纵向 -->
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
            class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold tabular-nums text-primary sm:mb-0.5"
          >
            {{ i + 1 }}
          </span>
          <span class="min-w-0 text-xs font-medium leading-snug">
            <RichText :text="item.label" />
          </span>
          <span v-if="item.note" class="min-w-0 text-[11px] leading-snug text-muted-foreground">
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

    <!-- layers:自上而下的堆叠结构 -->
    <div v-else-if="diagram.type === 'layers'" class="space-y-1">
      <div
        v-for="(item, i) in diagram.items"
        :key="i"
        class="flex items-start gap-2.5 rounded-md border px-3 py-2"
        :class="
          item.tone === 'primary'
            ? 'border-primary/25 bg-primary/[0.07]'
            : 'border-border/70 bg-muted/35'
        "
      >
        <span class="min-w-0 flex-1 text-xs font-medium leading-snug">
          <RichText :text="item.label" />
        </span>
        <span
          v-if="item.note"
          class="min-w-0 flex-[1.4] text-right text-[11px] leading-snug text-muted-foreground"
        >
          <RichText :text="item.note" />
        </span>
      </div>
    </div>

    <!-- tree:继承 / 组织结构 -->
    <div v-else-if="diagram.type === 'tree'" class="space-y-1">
      <div
        v-for="(node, i) in flatTree"
        :key="i"
        class="flex items-start gap-1.5 text-xs leading-snug"
        :style="{ paddingLeft: `${node.depth * 14}px` }"
      >
        <CornerDownRightIcon
          v-if="node.depth > 0"
          class="mt-0.5 size-3 shrink-0 text-muted-foreground/50"
        />
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
        <span v-if="node.note" class="min-w-0 text-muted-foreground">
          — <RichText :text="node.note" />
        </span>
      </div>
    </div>

    <!-- matrix:二维分类对照 -->
    <div v-else-if="diagram.type === 'matrix'" class="overflow-x-auto">
      <table class="w-full border-collapse text-left text-xs">
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
              class="border-b border-border/40 px-2 py-1.5 text-center text-muted-foreground"
            >
              <RichText :text="cell" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- memory:内存区域 + 槽位 + 引用指向 -->
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
          <p v-if="region.note" class="mt-0.5 text-[10px] leading-tight text-muted-foreground">
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
                class="min-w-0 shrink text-right font-mono text-[10px] leading-tight text-muted-foreground [overflow-wrap:anywhere]"
              >
                <RichText :text="slot.value" />
              </span>
            </div>
            <p
              v-if="slot.ref"
              class="mt-1 flex items-center gap-0.5 text-[10px] leading-tight text-primary"
            >
              <CornerDownRightIcon class="size-2.5 shrink-0" />
              指向 <RichText :text="slot.ref" />
            </p>
          </div>
          <p v-if="!region.slots.length" class="px-1 py-1 text-[10px] text-muted-foreground">—</p>
        </div>
      </div>
    </div>

    <!-- sequence:参与者 + 按时间顺序的消息 -->
    <div v-else-if="diagram.type === 'sequence'" class="space-y-2">
      <div class="flex flex-wrap items-center gap-1">
        <span
          v-for="(a, i) in diagram.actors"
          :key="i"
          class="rounded bg-muted px-2 py-1 font-mono text-[10px] font-medium leading-none text-muted-foreground"
        >
          {{ a }}
        </span>
        <span class="ml-auto flex items-center gap-1">
          <span
            v-if="seqShown !== Number.POSITIVE_INFINITY"
            class="font-mono text-[10px] tabular-nums text-muted-foreground"
          >
            {{ Math.min(seqShown, seqTotal) }}/{{ seqTotal }}
          </span>
          <button
            v-if="seqPlaying"
            type="button"
            class="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            @click="stopSeq"
          >
            <PauseIcon class="size-2.5" />暂停
          </button>
          <button
            v-else-if="seqShown === Number.POSITIVE_INFINITY"
            type="button"
            class="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/[0.07] px-1.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/[0.12]"
            @click="playSeq"
          >
            <PlayIcon class="size-2.5" />逐条播放
          </button>
          <button
            v-else
            type="button"
            class="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            @click="playSeq"
          >
            <RefreshCcwIcon class="size-2.5" />重放
          </button>
          <button
            v-if="seqShown !== Number.POSITIVE_INFINITY && !seqPlaying"
            type="button"
            class="rounded-md px-1 py-0.5 text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground"
            @click="resetSeq"
          >
            全部展开
          </button>
        </span>
      </div>
      <TransitionGroup tag="ol" name="seq" class="space-y-1.5 border-l border-dashed border-border/70 pl-2.5">
        <li
          v-for="(m, i) in seqMessages"
          :key="i"
          class="text-[11px] leading-snug"
        >
          <div class="flex flex-wrap items-baseline gap-x-1.5">
            <span class="font-mono text-[10px] text-muted-foreground">{{ i + 1 }}.</span>
            <span class="font-mono text-[10px] font-medium">{{ m.from }}</span>
            <span class="font-mono text-[10px] text-muted-foreground/70">
              {{ m.reply ? '┈┈▶' : '──▶' }}
            </span>
            <span class="font-mono text-[10px] font-medium">{{ m.to }}</span>
          </div>
          <p class="mt-0.5 pl-4 text-foreground/80"><RichText :text="m.text" /></p>
        </li>
      </TransitionGroup>
    </div>

    <!-- split:左右对照 -->
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

    <!-- scale:量级条形 -->
    <div v-else-if="diagram.type === 'scale'" class="space-y-1.5">
      <div v-for="(it, i) in diagram.items" :key="i" class="flex items-center gap-2">
        <span class="w-24 shrink-0 text-[11px] leading-tight sm:w-40" :title="it.label">
          <RichText :text="it.label" />
        </span>
        <div class="h-3.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/60">
          <div class="h-full rounded-sm bg-primary/45" :style="{ width: barWidth(it.value) }" />
        </div>
        <span class="w-[4.5rem] shrink-0 text-right font-mono text-[10px] text-muted-foreground">
          <RichText :text="it.display" />
        </span>
      </div>
      <div
        v-if="diagram.items.some((i) => i.note)"
        class="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[10px] leading-snug text-muted-foreground"
      >
        <span
          v-for="(it, i) in diagram.items.filter((x) => x.note)"
          :key="i"
          class="whitespace-nowrap"
        >
          <RichText :text="it.label" /> — <RichText :text="it.note" />
        </span>
      </div>
    </div>

    <!-- state:状态流转链 + 回退边 -->
    <div v-else-if="diagram.type === 'state'" class="flex flex-wrap items-center gap-x-1 gap-y-2">
      <template v-for="(s, i) in stateItems" :key="i">
        <div
          class="rounded-md border px-2.5 py-1.5"
          :class="
            s.tone === 'primary'
              ? 'border-primary/35 bg-primary/[0.08]'
              : 'border-border/70 bg-muted/40'
          "
        >
          <p class="flex items-center gap-1 text-[11px] font-medium leading-tight">
            <RichText :text="s.label" />
            <span
              v-if="backIdx.has(i + 1)"
              class="rounded bg-foreground/10 px-1 font-mono text-[9px] leading-tight text-muted-foreground"
            >
              {{ i + 1 }}
            </span>
          </p>
          <p v-if="s.note" class="mt-0.5 text-[10px] leading-tight text-muted-foreground">
            <RichText :text="s.note" />
          </p>
        </div>
        <div
          v-if="i < stateItems.length - 1"
          class="flex min-w-8 flex-col items-center text-muted-foreground/70"
        >
          <span class="max-w-36 px-0.5 text-center text-[10px] leading-tight">
            <RichText v-if="diagram.transitions?.[i]" :text="diagram.transitions[i]" />
          </span>
          <ChevronRightIcon class="size-3" />
        </div>
      </template>
      <p
        v-if="diagram.back"
        class="mt-1 flex w-full items-center gap-1 text-[10px] leading-snug text-muted-foreground"
      >
        <UndoIcon class="size-2.5 shrink-0" />
        回退 {{ diagram.back.from }} → {{ diagram.back.to }}:<RichText :text="diagram.back.label" />
      </p>
    </div>

    <figcaption v-if="caption" class="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
      <RichText :text="caption" />
    </figcaption>
  </figure>
</template>

<style scoped>
/* 时序图逐条播放时的入场：轻上浮 + 淡入。
   位移只有 4px —— 再大就会让整列在播放中「抖」，反而看不清顺序。 */
.seq-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.seq-enter-active {
  transition:
    opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}
.seq-leave-active {
  position: absolute;
  transition: opacity 0.16s ease;
}
.seq-leave-to {
  opacity: 0;
}
</style>
