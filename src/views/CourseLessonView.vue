<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleCheckIcon,
  ClockIcon,
  FileQuestionIcon,
  LockIcon,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/EmptyState.vue'
import LessonContent from '@/components/course/LessonContent.vue'
import LessonQuestionIndex from '@/components/course/LessonQuestionIndex.vue'
import LessonRunner from '@/components/course/LessonRunner.vue'
import LessonToc from '@/components/course/LessonToc.vue'
import { useCourseStore } from '@/stores/course'

const route = useRoute()
const router = useRouter()
const courseStore = useCourseStore()

const courseId = computed(() => String(route.params.courseId ?? ''))
const lessonId = computed(() => String(route.params.lessonId ?? ''))

const course = computed(() => courseStore.courseOf(courseId.value))

/** 正文里被「真题拆解」讲到的题;清单据此标出「正文精讲」 */
const focusQuestionIds = computed(() =>
  (lesson.value?.content.sections ?? []).filter((s) => s.kind === 'question').map((s) => s.questionId),
)
const found = computed(() =>
  courseStore.flatLessons(courseId.value).find((x) => x.lesson.id === lessonId.value),
)
const lesson = computed(() => found.value?.lesson)
const stage = computed(() => found.value?.stage)
const loadError = computed(() => courseStore.courseErrors[courseId.value] ?? '')

const completed = computed(
  () => !!lesson.value && courseStore.isLessonComplete(courseId.value, lesson.value.id),
)
const unlocked = computed(
  () => !!lesson.value && courseStore.isUnlocked(courseId.value, lesson.value.id),
)
const prev = computed(() => courseStore.prevLesson(courseId.value, lessonId.value))
const next = computed(() => courseStore.nextLessonAfter(courseId.value, lessonId.value))

/** 讲义区块的锚点目录:只在宽屏显示,窄屏靠正文自身节奏 */
const tocItems = computed(() =>
  (lesson.value?.content.sections ?? []).map((s, i) => ({
    id: `blk-${i}`,
    // 目录是纯文本,剥掉行内标记,否则会出现反引号与星号
    title: s.title.replace(/\*\*/g, '').replace(/`/g, ''),
  })),
)

watch(
  courseId,
  (id) => {
    if (id) void courseStore.loadCourse(id)
  },
  { immediate: true },
)

const HINT_KEY = 'interview-trainer/course-lock-hint'

/** 软锁提示每个会话只弹一次:直接输 URL 进来的人不该被反复打扰 */
function showLockHint() {
  if (sessionStorage.getItem(HINT_KEY)) return
  sessionStorage.setItem(HINT_KEY, '1')
  toast('这一课还没解锁', {
    description: '前一课尚未完成,按顺序看会更顺;当前课时仍可正常学习。',
  })
}

watch(
  lesson,
  (l) => {
    if (!l) return
    courseStore.touchLesson(courseId.value, l.id)
    window.scrollTo({ top: 0 })
    if (!courseStore.isUnlocked(courseId.value, l.id)) showLockHint()
  },
  { immediate: true },
)

/** LessonRunner 只在「全部题都自评过」时通知一次,写入课时完成度 */
function onComplete() {
  const l = lesson.value
  if (!l) return
  if (courseStore.markLessonComplete(courseId.value, l.id)) {
    toast.success('本课已完成,下一课已解锁')
  }
}

function go(id: string) {
  router.push({ name: 'course-lesson', params: { courseId: courseId.value, lessonId: id } })
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <!-- 面包屑 -->
    <div class="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <RouterLink :to="{ name: 'courses' }" class="transition-colors hover:text-foreground">
        学习路径
      </RouterLink>
      <span>/</span>
      <RouterLink
        :to="{ name: 'course-detail', params: { courseId } }"
        class="max-w-40 truncate transition-colors hover:text-foreground"
      >
        {{ course?.title ?? courseId }}
      </RouterLink>
      <template v-if="stage">
        <span>/</span>
        <span class="max-w-40 truncate">{{ stage.title }}</span>
      </template>
    </div>

    <!-- 加载失败 -->
    <div v-if="loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
      {{ loadError }}
      <Button variant="outline" size="sm" class="mt-2" @click="courseStore.loadCourse(courseId)">
        重试
      </Button>
    </div>

    <!-- 课时不存在 -->
    <EmptyState
      v-else-if="course && !lesson"
      :icon="FileQuestionIcon"
      title="找不到这个课时"
      description="课程内容可能已更新。回到课程大纲可以看到最新的课时列表。"
    >
      <Button size="sm" @click="router.push({ name: 'course-detail', params: { courseId } })">
        回到课程大纲
      </Button>
    </EmptyState>

    <div v-else-if="!lesson" class="space-y-3">
      <Skeleton class="h-16 rounded-xl" />
      <Skeleton class="h-64 rounded-xl" />
    </div>

    <template v-else>
      <div class="xl:grid xl:grid-cols-[minmax(0,1fr)_11rem] xl:gap-6">
        <div class="min-w-0">
      <!-- 课时头 -->
      <div class="mb-4">
        <div class="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            class="text-xs"
            :class="
              lesson.kind === 'concept'
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400'
            "
          >
            {{ lesson.kind === 'concept' ? '概念课' : '刷题课' }}
          </Badge>
          <Badge variant="outline" class="gap-1 text-xs text-muted-foreground">
            <ClockIcon class="size-3" />{{ lesson.estimatedMinutes }} 分钟
          </Badge>
          <Badge
            v-if="completed"
            variant="outline"
            class="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
          >
            <CircleCheckIcon />
            已完成
          </Badge>
          <Badge
            v-else-if="!unlocked"
            variant="outline"
            class="gap-1 border-amber-500/30 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400"
          >
            <LockIcon class="size-3" />
            前一课未完成
          </Badge>
        </div>
        <h1 class="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
          {{ lesson.title }}
        </h1>
      </div>

      <!-- 讲义:不再套一层卡片,避免「卡片里套卡片」,区块自己的面板就是层次 -->
      <div class="pt-1">
        <LessonContent :content="lesson.content" />
        <!-- 讲义 → 题库的对应关系:正文只精讲其中一两道,其余靠这张清单自查 -->
        <LessonQuestionIndex :ids="lesson.questionIds" :focus="focusQuestionIds" />
      </div>

      <!-- 关联题 -->
      <Card class="mt-3">
        <CardHeader class="pb-2">
          <CardTitle class="flex items-center justify-between gap-2 text-base">
            <span>练一练</span>
            <span class="text-xs font-normal text-muted-foreground">
              {{ lesson.questionIds.length }} 道关联真题
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LessonRunner
            :key="`${courseId}/${lesson.id}`"
            :question-ids="lesson.questionIds"
            @complete="onComplete"
          >
            <template #done>
              <Button v-if="next" size="sm" @click="go(next.id)">
                下一课
                <ArrowRightIcon />
              </Button>
              <Button
                v-else
                size="sm"
                variant="secondary"
                @click="router.push({ name: 'course-detail', params: { courseId } })"
              >
                回到课程大纲
              </Button>
            </template>
          </LessonRunner>

          <p v-if="!completed" class="mt-3 text-xs leading-relaxed text-muted-foreground">
            把上面 {{ lesson.questionIds.length }} 道题都自评一遍(「会 / 模糊 / 不会」均可)即算完成本课;
            「模糊 / 不会」会自动进入间隔重复队列。
          </p>
        </CardContent>
      </Card>

      <!-- 上一课 / 下一课 -->
      <div class="mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          :disabled="!prev"
          class="min-w-0"
          @click="prev && go(prev.id)"
        >
          <ArrowLeftIcon class="shrink-0" />
          <span class="truncate">{{ prev?.title ?? '已是第一课' }}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :disabled="!next"
          class="min-w-0"
          @click="next && go(next.id)"
        >
          <span class="truncate">{{ next?.title ?? '已是最后一课' }}</span>
          <ArrowRightIcon class="shrink-0" />
        </Button>
      </div>
        </div>

        <aside class="hidden xl:block">
          <LessonToc :items="tocItems" />
        </aside>
      </div>
    </template>
  </div>
</template>
