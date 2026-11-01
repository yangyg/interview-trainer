<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
    <div
      data-slot="card"
      :class="
        cn(
          // 移动端原生卡片:大圆角、去描边、浅阴影;lg 恢复桌面描边风格(DESIGN.md 移动端章节)
          'bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border border-transparent py-6 shadow-xs lg:rounded-xl lg:border lg:shadow-sm',
          props.class,
        )
      "
    >
      <slot />
    </div>
</template>
