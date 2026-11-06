<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    current: number
    max: number
    label: string
    /** enemy 表示敌方血条，始终用伤害色 */
    tone?: 'player' | 'enemy'
  }>(),
  { tone: 'player' },
)

const pct = computed(() => Math.max(0, Math.min(100, (props.current / Math.max(1, props.max)) * 100)))
const band = computed(() => {
  if (props.tone === 'enemy') return 'enemy'
  if (pct.value <= 30) return 'low'
  if (pct.value <= 60) return 'mid'
  return 'full'
})
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-2 text-xs">
      <span class="text-muted-foreground">{{ label }}</span>
      <span class="font-mono tabular-nums">{{ current }} / {{ max }}</span>
    </div>
    <div
      class="hp-track mt-1 h-2 overflow-hidden rounded-full"
      role="progressbar"
      :aria-label="label"
      :aria-valuenow="current"
      aria-valuemin="0"
      :aria-valuemax="max"
    >
      <div
        class="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
        :class="`hp-fill-${band}`"
        :style="{ width: `${pct}%` }"
      />
    </div>
  </div>
</template>
