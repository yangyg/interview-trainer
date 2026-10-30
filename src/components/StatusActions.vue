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
  { result: 'mastered', label: '会', icon: CircleCheckIcon, activeCls: 'status-mastered' },
  { result: 'fuzzy', label: '模糊', icon: CircleMinusIcon, activeCls: 'status-fuzzy' },
  { result: 'wrong', label: '不会', icon: CircleXIcon, activeCls: 'status-wrong' },
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
