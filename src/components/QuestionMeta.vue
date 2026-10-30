<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { useProgressStore } from '@/stores/progress'
import type { CardStatus, Question } from '@/lib/types'
import { FlameIcon, StarIcon } from '@lucide/vue'

const props = defineProps<{
  question: Question
  /** 是否显示掌握状态徽章 */
  showStatus?: boolean
}>()

const progress = useProgressStore()

const statusMeta: Record<CardStatus, { label: string; cls: string }> = {
  mastered: { label: '已掌握', cls: 'status-mastered' },
  fuzzy: { label: '模糊', cls: 'status-fuzzy' },
  wrong: { label: '不会', cls: 'status-wrong' },
}

const status = computed(() => {
  const r = progress.recordOf(props.question.id)
  return r ? statusMeta[r.status] : null
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <Badge
      v-if="question.frequency"
      variant="outline"
      class="border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
      :title="`考频热度 ${question.frequency}`"
    >
      <FlameIcon />
      {{ question.frequency }}
    </Badge>
    <Badge
      v-if="question.difficulty"
      variant="outline"
      class="border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
      :title="`难度 ${question.difficulty}`"
    >
      <StarIcon />
      {{ question.difficulty }}
    </Badge>
    <Badge
      v-for="tag in question.tags"
      :key="tag"
      variant="secondary"
      class="text-muted-foreground"
    >
      {{ tag }}
    </Badge>
    <Badge v-if="showStatus && status" variant="outline" :class="status.cls">
      {{ status.label }}
    </Badge>
  </div>
</template>
