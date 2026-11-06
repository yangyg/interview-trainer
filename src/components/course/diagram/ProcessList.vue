<script setup lang="ts">
import RichText from '@/components/course/RichText.vue'
import type { PlayablePayload } from '@/lib/timeline'
import { ROW_CLASS, TAG_DOT, TAG_LABEL, TAG_TEXT, type ViewPhase } from './playerTokens'

/** 三态列表：sequence 用原来的消息卡片，其余过程类用带竖线的步骤时间轴 */
const props = defineProps<{
  events: PlayablePayload[]
  phases: ViewPhase[]
  variant: 'sequence' | 'timeline'
}>()
const emit = defineEmits<{ jump: [n: number] }>()

const OPACITY: Record<ViewPhase, string> = {
  idle: 'opacity-100',
  past: 'opacity-70',
  current: 'opacity-100',
  future: 'opacity-40',
}
</script>

<template>
  <!-- sequence：全部行预渲染，靠三态区分，点任一行直接形变过去 -->
  <ol v-if="props.variant === 'sequence'" class="space-y-1.5">
    <li v-for="(p, i) in props.events" :key="i">
      <button
        type="button"
        class="flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] leading-snug transition-opacity duration-200 hover:border-primary/40"
        :class="ROW_CLASS[props.phases[i] ?? 'idle']"
        :aria-current="props.phases[i] === 'current' ? 'step' : undefined"
        :aria-label="`跳到第 ${p.no} 条：${p.from ?? ''} 到 ${p.to ?? ''}`"
        @click="emit('jump', p.no)"
      >
        <span
          class="mt-px flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold tabular-nums text-background"
          :class="TAG_DOT[p.tag]"
        >
          {{ p.no }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex flex-wrap items-baseline gap-x-1.5">
            <span class="font-mono font-medium">{{ p.from }}</span>
            <span class="font-mono text-muted-foreground/70">{{ p.reply ? '┈┈▶' : '──▶' }}</span>
            <span class="font-mono font-medium">{{ p.to }}</span>
            <span
              class="rounded border border-border/60 px-1 font-mono text-[11px] opacity-70"
              :class="TAG_TEXT[p.tag]"
            >
              {{ TAG_LABEL[p.tag] }}
            </span>
          </span>
          <span class="mt-0.5 block text-foreground/85"><RichText :text="p.label" /></span>
        </span>
      </button>
    </li>
  </ol>

  <!-- flow / layers / state / principle：编号 + 竖线，强调「时间往前走」 -->
  <ol v-else class="space-y-0">
    <li v-for="(p, i) in props.events" :key="i" class="flex gap-2.5">
      <div class="flex flex-col items-center">
        <span
          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold tabular-nums text-background transition-opacity duration-200"
          :class="[TAG_DOT[p.tag], OPACITY[props.phases[i] ?? 'idle']]"
        >
          {{ p.no }}
        </span>
        <span v-if="i < props.events.length - 1" class="my-1 w-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <button
        type="button"
        class="min-w-0 flex-1 rounded-md px-1.5 pb-2.5 text-left transition-opacity duration-200 hover:bg-primary/[0.04]"
        :class="[
          OPACITY[props.phases[i] ?? 'idle'],
          props.phases[i] === 'current' ? 'bg-primary/[0.06] ring-1 ring-primary/25' : '',
        ]"
        :aria-current="props.phases[i] === 'current' ? 'step' : undefined"
        :aria-label="`跳到第 ${p.no} 步：${p.label}`"
        @click="emit('jump', p.no)"
      >
        <p class="text-xs font-medium leading-5"><RichText :text="p.label" /></p>
        <p v-if="p.detail" class="mt-0.5 text-[11px] leading-5 text-muted-foreground">
          <RichText :text="p.detail" />
        </p>
      </button>
    </li>
  </ol>
</template>
