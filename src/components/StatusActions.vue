<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useProgressStore } from '@/stores/progress'
import type { GradeResult } from '@/lib/types'
import { CircleCheckIcon, CircleMinusIcon, CircleXIcon } from '@lucide/vue'

const props = defineProps<{
  questionId: string
  /** 紧凑模式(卡片底部) */
  compact?: boolean
}>()

const emit = defineEmits<{ graded: [result: GradeResult] }>()

const progress = useProgressStore()

const current = computed(() => progress.recordOf(props.questionId)?.status)

const options: { result: GradeResult; label: string; icon: typeof CircleCheckIcon; activeCls: string }[] = [
  { result: 'mastered', label: '会', icon: CircleCheckIcon, activeCls: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { result: 'fuzzy', label: '模糊', icon: CircleMinusIcon, activeCls: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { result: 'wrong', label: '不会', icon: CircleXIcon, activeCls: 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400' },
]

function grade(result: GradeResult) {
  progress.grade(props.questionId, result)
  emit('graded', result)
}
</script>

<template>
  <div class="flex items-center gap-2" :class="compact ? '' : 'flex-wrap'">
    <Button
      v-for="opt in options"
      :key="opt.result"
      :variant="current === opt.result ? 'outline' : 'ghost'"
      :size="compact ? 'sm' : 'default'"
      :class="current === opt.result ? opt.activeCls : 'text-muted-foreground'"
      @click="grade(opt.result)"
    >
      <component :is="opt.icon" />
      {{ opt.label }}
    </Button>
  </div>
</template>
