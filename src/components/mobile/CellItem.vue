<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ChevronRightIcon } from '@lucide/vue'

defineProps<{
  icon?: Component
  label: string
  /** 右侧灰色说明文字(与 slot:trailing 互斥使用更清晰) */
  detail?: string
  /** 传入则渲染为 RouterLink(带右箭头),否则为可点按钮 */
  to?: RouteLocationRaw
}>()

const emit = defineEmits<{ (e: 'click'): void }>()

// 两种渲染形态共享的行内样式
const cellClass =
  'pressable flex w-full items-center gap-3 bg-card px-3.5 py-3 text-foreground transition-colors'
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="cellClass">
    <span v-if="icon" class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
      <component :is="icon" class="size-4" />
    </span>
    <span class="min-w-0 flex-1 truncate text-[15px]">{{ label }}</span>
    <slot name="trailing">
      <span v-if="detail" class="shrink-0 text-sm text-muted-foreground">{{ detail }}</span>
      <ChevronRightIcon class="size-4 shrink-0 text-muted-foreground/50" />
    </slot>
  </RouterLink>
  <button v-else type="button" :class="cellClass" @click="emit('click')">
    <span v-if="icon" class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
      <component :is="icon" class="size-4" />
    </span>
    <span class="min-w-0 flex-1 truncate text-left text-[15px]">{{ label }}</span>
    <slot name="trailing">
      <span v-if="detail" class="shrink-0 text-sm text-muted-foreground">{{ detail }}</span>
    </slot>
  </button>
</template>
