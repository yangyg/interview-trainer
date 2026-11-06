<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRightIcon } from '@lucide/vue'
import RichText from '@/components/course/RichText.vue'

/**
 * 讲义正文的「注解化」封装：首段常显作为读图引导，其余收进原生 details。
 * 文字始终留在 DOM 里（可索引、可打印、可 Ctrl+F），只是不再抢主视图。
 * 课时级「全文精读」模式把 mode 设为 text，强制展开。
 */
const props = withDefaults(
  defineProps<{
    body?: string[]
    mode?: 'visual' | 'text'
    /** 课时导语用稍大一号的首段,与区块级注解拉开层次 */
    lead?: boolean
  }>(),
  { mode: 'visual', lead: false },
)

const first = computed(() => props.body?.[0] ?? '')
const rest = computed(() => (props.body ?? []).slice(1))
/** 去掉行内标记再估字数，避免把 ** 和 ` 也算进去 */
const chars = computed(() =>
  rest.value.join('').replace(/\*\*|`|\[\[|\]\]|!!/g, '').length,
)
</script>

<template>
  <div v-if="props.body?.length" class="space-y-1.5">
    <p :class="props.lead ? 'text-sm leading-7 text-foreground/85' : 'text-[13px] leading-6 text-muted-foreground'">
      <RichText :text="first" />
    </p>
    <details v-if="rest.length" :open="props.mode === 'text'" class="group">
      <summary
        class="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border/60 px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden"
      >
        <ChevronRightIcon class="size-3 transition-transform group-open:rotate-90" />
        展开文字详解（{{ rest.length }} 段 · 约 {{ chars }} 字）
      </summary>
      <div class="mt-1.5 space-y-1.5 border-l border-border/60 pl-3">
        <p v-for="(p, i) in rest" :key="i" class="text-[13px] leading-6 text-muted-foreground">
          <RichText :text="p" />
        </p>
      </div>
    </details>
  </div>
</template>
