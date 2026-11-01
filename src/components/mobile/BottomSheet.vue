<script setup lang="ts">
import { computed } from 'vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const props = defineProps<{
  /** 标题;不传则只显示拖拽把手 */
  title?: string
  open?: boolean
  /** 透传给内容滚动容器的类(如 overflow-hidden 固定高度面板) */
  contentClass?: string
}>()

const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const open = computed({
  get: () => props.open ?? false,
  set: (v) => emit('update:open', v),
})
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      side="bottom"
      class="mx-auto max-h-[92svh] gap-0 rounded-t-2xl border-t-0 px-4 pb-safe pt-2 sm:max-w-lg"
    >
      <!-- 拖拽把手(装饰);关闭用 SheetContent 内置的右上角 X -->
      <div class="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />

      <SheetHeader v-if="title" class="py-2 pr-10">
        <SheetTitle class="text-base font-semibold">{{ title }}</SheetTitle>
        <SheetDescription class="sr-only">{{ title }}</SheetDescription>
      </SheetHeader>
      <SheetTitle v-else class="sr-only">面板</SheetTitle>
      <SheetDescription v-if="!title" class="sr-only">底部面板</SheetDescription>

      <div :class="$props.contentClass" class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <slot />
      </div>
    </SheetContent>
  </Sheet>
</template>
