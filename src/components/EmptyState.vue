<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 px-6 text-center">
    <div class="flex size-12 items-center justify-center rounded-full bg-muted">
      <component :is="icon" class="size-6 text-muted-foreground" />
    </div>
    <div class="space-y-1">
      <p class="text-sm font-medium">{{ title }}</p>
      <p v-if="description" class="text-xs text-muted-foreground max-w-sm">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
