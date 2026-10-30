<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDownIcon, CircleCheckIcon, ClockIcon, LockIcon, TargetIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import LessonRunner from '@/components/course/LessonRunner.vue'
import { useCourseStore } from '@/stores/course'
import { useProgressStore } from '@/stores/progress'
import type { Stage } from '@/lib/types'

const props = defineProps<{ courseId: string; stage: Stage; index: number }>()

const courseStore = useCourseStore()
const progress = useProgressStore()

const stageProgress = computed(() => courseStore.stageProgress(props.courseId, props.stage.id))
const stageDone = computed(
  () => stageProgress.value.total > 0 && stageProgress.value.done >= stageProgress.value.total,
)

/** 默认展开:第一阶段,或包含「下一个要学的课时」的那一阶段 */
const containsNext = computed(() => {
  const next = courseStore.nextLesson(props.courseId)
  return !!next && props.stage.lessons.some((l) => l.id === next.id)
})
const open = ref(props.index === 0 || containsNext.value)

// ---------- 阶段验收 ----------

const checkpointOpen = ref(false)
const checkpointResult = ref<{ passed: boolean; ratio: number } | null>(null)

const checkpointIds = computed(() =>
  props.stage.checkpoint.questionIds.filter((id) => !!progress.recordOf(id)),
)

function toggleCheckpoint() {
  if (checkpointOpen.value) {
    checkpointOpen.value = false
    return
  }
  checkpointResult.value = null
  checkpointOpen.value = true
}

function onCheckpointComplete() {
  const ids = props.stage.checkpoint.questionIds
  const mastered = ids.filter((id) => progress.recordOf(id)?.status === 'mastered').length
  const ratio = ids.length ? mastered / ids.length : 0
  checkpointResult.value = { passed: ratio >= props.stage.checkpoint.passRatio, ratio }
}
</script>

<template>
  <section class="rounded-xl border bg-card">
    <button
      type="button"
      class="flex w-full items-center gap-3 p-4 text-left"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        :class="
          stageDone
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground'
        "
      >
        <CircleCheckIcon v-if="stageDone" class="size-4" />
        <template v-else>{{ index + 1 }}</template>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold">{{ stage.title }}</span>
        <span class="mt-0.5 block truncate text-xs text-muted-foreground">{{ stage.goal }}</span>
      </span>
      <span class="hidden shrink-0 items-center gap-2 sm:flex">
        <Progress :model-value="stageProgress.pct" class="h-1.5 w-16" />
        <span class="text-xs tabular-nums text-muted-foreground">
          {{ stageProgress.done }}/{{ stageProgress.total }}
        </span>
      </span>
      <ChevronDownIcon
        class="size-4 shrink-0 text-muted-foreground transition-transform"
        :class="open && 'rotate-180'"
      />
    </button>

    <div v-show="open" class="border-t">
      <p class="px-4 pt-3 text-xs leading-relaxed text-muted-foreground">{{ stage.summary }}</p>

      <div class="mt-2 flex flex-col">
        <RouterLink
          v-for="(lesson, i) in stage.lessons"
          :key="lesson.id"
          :to="{ name: 'course-lesson', params: { courseId, lessonId: lesson.id } }"
          class="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60"
        >
          <span
            class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums"
            :class="
              courseStore.isLessonComplete(courseId, lesson.id)
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            "
          >
            <CircleCheckIcon
              v-if="courseStore.isLessonComplete(courseId, lesson.id)"
              class="size-3.5"
            />
            <template v-else>{{ i + 1 }}</template>
          </span>

          <span class="min-w-0 flex-1">
            <span
              class="block truncate text-sm"
              :class="
                courseStore.isUnlocked(courseId, lesson.id)
                  ? ''
                  : 'text-muted-foreground'
              "
            >
              {{ lesson.title }}
            </span>
            <span class="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                class="rounded px-1 py-px"
                :class="
                  lesson.kind === 'concept'
                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                    : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                "
              >
                {{ lesson.kind === 'concept' ? '概念' : '刷题' }}
              </span>
              <span>{{ lesson.questionIds.length }} 题</span>
              <span class="inline-flex items-center gap-0.5">
                <ClockIcon class="size-3" />{{ lesson.estimatedMinutes }} 分
              </span>
            </span>
          </span>

          <LockIcon
            v-if="!courseStore.isUnlocked(courseId, lesson.id)"
            class="size-3.5 shrink-0 text-muted-foreground/60"
          />
        </RouterLink>
      </div>

      <!-- 阶段验收 -->
      <div class="border-t bg-muted/20 px-4 py-3">
        <div class="flex flex-wrap items-center gap-3">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/5">
            <TargetIcon class="size-3.5 text-muted-foreground" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">阶段验收</p>
            <p class="text-xs text-muted-foreground">
              {{ stage.checkpoint.questionIds.length }} 道混合题 · 掌握
              {{ Math.round(stage.checkpoint.passRatio * 100) }}% 以上算通过 ·
              已自评 {{ checkpointIds.length }}/{{ stage.checkpoint.questionIds.length }}
            </p>
          </div>
          <Badge
            v-if="checkpointResult"
            variant="outline"
            :class="
              checkpointResult.passed
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            "
          >
            {{ checkpointResult.passed ? '通过' : '未通过' }}
            {{ Math.round(checkpointResult.ratio * 100) }}%
          </Badge>
          <Button variant="outline" size="sm" @click="toggleCheckpoint">
            {{ checkpointOpen ? '收起验收' : checkpointResult ? '再验一次' : '开始验收' }}
          </Button>
        </div>

        <div v-if="checkpointOpen" class="mt-3">
          <LessonRunner
            :key="`${stage.id}-checkpoint`"
            :question-ids="stage.checkpoint.questionIds"
            @complete="onCheckpointComplete"
          >
            <template #done>
              <Button size="sm" variant="ghost" @click="checkpointOpen = false">收起</Button>
            </template>
          </LessonRunner>
        </div>
      </div>
    </div>
  </section>
</template>
