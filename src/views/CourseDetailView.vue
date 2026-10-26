<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  CircleCheckIcon,
  ClockIcon,
  LayersIcon,
  ListChecksIcon,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/EmptyState.vue'
import StageSection from '@/components/course/StageSection.vue'
import { LANG_META } from '@/lib/langs'
import { useCourseStore } from '@/stores/course'
import type { CourseSummary } from '@/lib/types'

const route = useRoute()
const router = useRouter()
const courseStore = useCourseStore()

const courseId = computed(() => String(route.params.courseId ?? ''))
const summary = computed(() => courseStore.summaryOf(courseId.value))
const course = computed(() => courseStore.courseOf(courseId.value))
const loadError = computed(() => courseStore.courseErrors[courseId.value] ?? '')

watch(
  courseId,
  (id) => {
    if (id) void courseStore.loadCourse(id)
  },
  { immediate: true },
)

const LEVEL_LABEL: Record<CourseSummary['level'], string> = {
  intro: '入门',
  advanced: '进阶',
  expert: '专家',
}

const progress = computed(() => courseStore.courseProgress(courseId.value))
const done = computed(() => progress.value.total > 0 && progress.value.done >= progress.value.total)

/** 「继续」优先落到下一个未完成课时,全部完成则回到第一课复习 */
const targetLessonId = computed(
  () =>
    courseStore.nextLesson(courseId.value)?.id ??
    course.value?.firstLessonId ??
    summary.value?.firstLessonId ??
    '',
)

const prerequisites = computed(() =>
  (summary.value?.prerequisites ?? [])
    .map((id) => courseStore.summaryOf(id))
    .filter((c): c is CourseSummary => !!c),
)

function goLesson(lessonId: string) {
  if (!lessonId) return
  router.push({ name: 'course-lesson', params: { courseId: courseId.value, lessonId } })
}
</script>

<template>
  <div>
    <button
      type="button"
      class="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      @click="router.push({ name: 'courses' })"
    >
      <ArrowLeftIcon class="size-3.5" />
      学习路径
    </button>

    <!-- 课程不存在 -->
    <EmptyState
      v-if="courseStore.isIndexReady && !summary"
      :icon="BookOpenIcon"
      title="找不到这门课程"
      description="链接可能来自旧版本;课程内容更新后 id 会变。"
    >
      <Button size="sm" @click="router.push({ name: 'courses' })">返回学习路径</Button>
    </EmptyState>

    <!-- 索引加载中 -->
    <div v-else-if="!summary" class="space-y-3">
      <Skeleton class="h-40 rounded-xl" />
      <Skeleton class="h-64 rounded-xl" />
    </div>

    <template v-else>
      <!-- 课程头 -->
      <Card class="overflow-hidden">
        <div class="relative">
          <div class="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative flex flex-wrap items-start gap-4 p-5 sm:p-6">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              :class="LANG_META[summary.language].badge"
            >
              {{ LANG_META[summary.language].short }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
                  {{ summary.title }}
                </h1>
                <Badge variant="outline" class="text-[10px] text-foreground/70">
                  {{ LEVEL_LABEL[summary.level] }}
                </Badge>
                <Badge
                  v-if="done"
                  variant="outline"
                  class="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400"
                >
                  <CircleCheckIcon />
                  已完成
                </Badge>
              </div>
              <p class="mt-1.5 max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground">
                {{ summary.subtitle }}
              </p>
              <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                <span class="inline-flex items-center gap-1">
                  <LayersIcon class="size-3" />{{ summary.stageCount }} 阶段
                </span>
                <span class="inline-flex items-center gap-1">
                  <ListChecksIcon class="size-3" />{{ summary.lessonCount }} 课时
                </span>
                <span class="inline-flex items-center gap-1">
                  <ClockIcon class="size-3" />约 {{ summary.estimatedMinutes }} 分钟
                </span>
                <span class="tabular-nums">{{ summary.uniqueQuestionCount }} 道关联真题</span>
              </div>
            </div>
            <div class="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
              <Button :disabled="!targetLessonId" @click="goLesson(targetLessonId)">
                {{ done ? '从头复习' : progress.done > 0 ? '继续学习' : '开始学习' }}
                <ArrowRightIcon />
              </Button>
              <div class="flex items-center gap-2">
                <Progress :model-value="progress.pct" class="h-1.5 flex-1 sm:w-28" />
                <span class="text-[11px] tabular-nums text-muted-foreground">
                  {{ progress.done }}/{{ progress.total }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- 学完你能 + 前置 -->
      <div class="mt-3 grid gap-3 lg:grid-cols-5">
        <Card class="lg:col-span-3">
          <CardHeader class="pb-2">
            <CardTitle class="text-base">学完你能</CardTitle>
          </CardHeader>
          <CardContent>
            <ul class="space-y-2">
              <li v-for="(o, i) in summary.outcomes" :key="i" class="flex gap-2.5 text-sm leading-6">
                <CheckIcon class="mt-1 size-3.5 shrink-0 text-emerald-500" />
                <span class="min-w-0">{{ o }}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card class="lg:col-span-2">
          <CardHeader class="pb-2">
            <CardTitle class="text-base">建议前置</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <template v-if="prerequisites.length">
              <button
                v-for="p in prerequisites"
                :key="p.id"
                type="button"
                class="flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent"
                @click="router.push({ name: 'course-detail', params: { courseId: p.id } })"
              >
                <span
                  class="flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                  :class="LANG_META[p.language].badge"
                >
                  {{ LANG_META[p.language].short }}
                </span>
                <span class="min-w-0 flex-1 truncate text-xs font-medium">{{ p.title }}</span>
                <ArrowRightIcon class="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </template>
            <p v-else class="text-xs leading-relaxed text-muted-foreground">
              无需前置,直接从这里开始。
            </p>
            <p class="pt-1 text-[11px] leading-relaxed text-muted-foreground">
              前置不是硬门槛:课时可在任意时刻单独打开,只是顺序推进时会更顺。
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- 大纲 -->
      <div class="mt-5 mb-2.5 flex items-center justify-between">
        <h2 class="text-sm font-semibold">课程大纲</h2>
        <span class="text-[11px] text-muted-foreground">{{ summary.stageCount }} 个阶段 · 逐段解锁</span>
      </div>

      <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
        课程内容加载失败:{{ loadError }}
        <Button variant="outline" size="sm" class="mt-2" @click="courseStore.loadCourse(courseId)">
          重试
        </Button>
      </div>

      <div v-else-if="!course" class="space-y-3">
        <Skeleton v-for="i in 3" :key="i" class="h-20 rounded-xl" />
      </div>

      <div v-else class="space-y-2.5">
        <StageSection
          v-for="(stage, i) in course.stages"
          :key="stage.id"
          :course-id="courseId"
          :stage="stage"
          :index="i"
        />
      </div>
    </template>
  </div>
</template>
