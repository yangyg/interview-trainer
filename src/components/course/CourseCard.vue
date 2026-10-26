<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRightIcon, CircleCheckIcon, ClockIcon, LayersIcon, ListChecksIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LANG_META } from '@/lib/langs'
import { useCourseStore } from '@/stores/course'
import type { CourseSummary } from '@/lib/types'

const props = defineProps<{ course: CourseSummary }>()

const router = useRouter()
const courseStore = useCourseStore()

const LEVEL_LABEL: Record<CourseSummary['level'], string> = {
  intro: '入门',
  advanced: '进阶',
  expert: '专家',
}

const pct = computed(() => courseStore.courseProgress(props.course.id))
const done = computed(() => pct.value.total > 0 && pct.value.done >= pct.value.total)
const started = computed(() => pct.value.done > 0)

function open() {
  router.push({ name: 'course-detail', params: { courseId: props.course.id } })
}
</script>

<template>
  <button
    type="button"
    class="group flex h-full flex-col rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
    @click="open"
  >
    <div class="flex items-start gap-2.5">
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
        :class="LANG_META[course.language].badge"
      >
        {{ LANG_META[course.language].short }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold leading-snug">{{ course.title }}</p>
          <Badge variant="outline" class="shrink-0 px-1.5 py-0 text-[10px] text-foreground/70">
            {{ LEVEL_LABEL[course.level] }}
          </Badge>
        </div>
        <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {{ course.subtitle }}
        </p>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span class="inline-flex items-center gap-1">
        <LayersIcon class="size-3" />{{ course.stageCount }} 阶段
      </span>
      <span class="inline-flex items-center gap-1">
        <ListChecksIcon class="size-3" />{{ course.lessonCount }} 课时
      </span>
      <span class="inline-flex items-center gap-1">
        <ClockIcon class="size-3" />{{ course.estimatedMinutes }} 分钟
      </span>
      <span class="inline-flex items-center gap-1 tabular-nums">{{ course.uniqueQuestionCount }} 题</span>
    </div>

    <div class="mt-3 flex items-center gap-2">
      <Progress :model-value="pct.pct" class="h-1.5" />
      <span class="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {{ pct.done }}/{{ pct.total }}
      </span>
    </div>

    <div class="mt-auto flex items-center justify-between pt-3 text-xs">
      <span
        v-if="done"
        class="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400"
      >
        <CircleCheckIcon class="size-3.5" />
        已完成
      </span>
      <span v-else-if="started" class="text-muted-foreground">学到第 {{ pct.done + 1 }} 课</span>
      <span v-else class="text-muted-foreground">还没开始</span>
      <span class="inline-flex items-center gap-1 font-medium text-primary">
        {{ done ? '复习' : started ? '继续' : '开始' }}
        <ArrowRightIcon class="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </button>
</template>
