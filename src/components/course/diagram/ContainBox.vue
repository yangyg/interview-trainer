<script setup lang="ts">
import { computed } from 'vue'
import RichText from '@/components/course/RichText.vue'

/**
 * 嵌套包含图的一层：外层框真的把内层框包在里面，靠几何关系表达 A ⊃ B，
 * 而不是靠「第一行 / 第二行」的编号暗示。这是纯空间结构，刻意不接步进播放。
 */
interface ContainLayer {
  label: string
  note?: string
  tone?: 'primary' | 'muted'
}

defineOptions({ name: 'ContainBox' })

const props = withDefaults(defineProps<{ items: ContainLayer[]; depth?: number }>(), { depth: 0 })
const head = computed(() => props.items[0])
const rest = computed(() => props.items.slice(1))

/** 越往内边框与底色越实，让「包含」不依赖文字也能读出来 */
const shell = computed(() => {
  if (head.value?.tone === 'muted') return 'border-border/70 bg-muted/20'
  if (props.depth === 0) return 'border-primary/30 bg-primary/[0.05]'
  if (props.depth === 1) return 'border-primary/40 bg-primary/[0.08]'
  return 'border-primary/50 bg-primary/[0.11]'
})
const isInnermost = computed(() => rest.value.length === 0)
</script>

<template>
  <div
    v-if="head"
    class="rounded-xl border p-2.5 sm:p-3"
    :class="[shell, isInnermost ? 'ring-1 ring-inset ring-primary/20' : '']"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="size-1.5 shrink-0 rounded-full bg-primary/70" />
        <span class="min-w-0 text-xs font-semibold leading-snug sm:text-[13px]">
          <RichText :text="head.label" />
        </span>
      </div>
      <span
        v-if="!isInnermost"
        class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
      >
        包含 ↓
      </span>
    </div>
    <p v-if="head.note" class="mt-1.5 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
      <RichText :text="head.note" />
    </p>
    <ContainBox v-if="!isInnermost" :items="rest" :depth="depth + 1" class="mt-2.5" />
  </div>
</template>
