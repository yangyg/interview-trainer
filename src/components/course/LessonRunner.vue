<script setup lang="ts">
import { computed, watch } from 'vue'
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, RotateCcwIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import AnswerBody from '@/components/AnswerBody.vue'
import QuestionMeta from '@/components/QuestionMeta.vue'
import StatusActions from '@/components/StatusActions.vue'
import { useQuestionSession } from '@/composables/useQuestionSession'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'
import type { GradeResult } from '@/lib/types'

const props = defineProps<{ questionIds: string[] }>()

const emit = defineEmits<{
  /** 本组题全部自评过(含历史记录)——由父级决定是否写课程进度 */
  complete: []
  graded: [result: GradeResult, questionId: string]
}>()

const dataStore = useDataStore()
const progress = useProgressStore()

/** 课程数据里引用的题号理论上都存在(构建期已校验),这里仍过滤一次兜底 */
const cards = computed(() =>
  props.questionIds.map((id) => dataStore.questionsById[id]).filter((q) => !!q),
)

const session = useQuestionSession(() => cards.value.map((q) => q.id))
const current = computed(() =>
  session.currentId.value ? dataStore.questionsById[session.currentId.value] : undefined,
)

const allGraded = computed(
  () => cards.value.length > 0 && cards.value.every((q) => !!progress.recordOf(q.id)),
)

// 只在「全部完成」这一状态翻转时抛一次,避免父级被重复通知
watch(allGraded, (v) => {
  if (v) emit('complete')
}, { immediate: true })

/** 上一题回看时直接展开答案 */
function goPrev() {
  session.prev()
}

/**
 * 唯一评分入口是 StatusActions(它内部调 progress.grade)。
 * 这里只做「记账 + 翻页」,绝不重复写学习进度。
 */
function onGraded(result: GradeResult) {
  const id = session.currentId.value
  if (!id) return
  session.record(id, result)
  emit('graded', result, id)
  session.next()
}

function replay() {
  session.reset()
}
</script>

<template>
  <div>
    <!-- 全部走完:小结 -->
    <Card v-if="session.finished.value">
      <CardHeader>
        <CardTitle class="text-base">本组 {{ session.total.value }} 题已过完</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline" class="status-mastered">
            会 {{ session.counts.value.mastered }}
          </Badge>
          <Badge variant="outline" class="status-fuzzy">
            模糊 {{ session.counts.value.fuzzy }}
          </Badge>
          <Badge variant="outline" class="status-wrong">
            不会 {{ session.counts.value.wrong }}
          </Badge>
        </div>
        <p class="text-xs leading-relaxed text-muted-foreground">
          「模糊 / 不会」已进入间隔重复队列,会在 1 天内重新推送;这里不必强求一次全记住。
        </p>
        <div class="flex flex-wrap gap-2 pt-1">
          <slot name="done" />
          <Button variant="outline" size="sm" @click="replay">
            <RotateCcwIcon />
            再练一遍
          </Button>
        </div>
      </CardContent>
    </Card>

    <template v-else-if="current">
      <div class="mb-3 flex items-center gap-3">
        <Progress :model-value="session.pct.value" class="h-1.5 flex-1" />
        <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
          {{ Math.min(session.index.value + 1, session.total.value) }} / {{ session.total.value }}
        </span>
      </div>

      <Card>
        <CardHeader class="gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <QuestionMeta :question="current" />
            <Badge variant="outline" class="font-mono text-xs text-muted-foreground">
              {{ current.no }}
            </Badge>
          </div>
          <CardTitle class="text-base leading-snug sm:text-lg">{{ current.title }}</CardTitle>
        </CardHeader>
        <CardContent>
          <Transition name="page" mode="out-in">
            <div v-if="session.revealed.value" key="answer" class="space-y-4">
              <AnswerBody :question="current" />
              <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <span class="text-xs text-muted-foreground">对照要点自评,决定下次复习间隔</span>
                <StatusActions :question-id="current.id" compact @graded="onGraded" />
              </div>
            </div>
            <div v-else key="front" class="flex flex-col items-center gap-3 py-8">
              <Button size="lg" @click="session.reveal()">
                <EyeIcon />
                显示参考答案
              </Button>
              <p class="text-center text-xs text-muted-foreground">
                先在心里过一遍答案再看解析——直接翻答案的留存率不到一半
              </p>
            </div>
          </Transition>
        </CardContent>
      </Card>

      <div class="mt-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          :disabled="session.index.value === 0"
          @click="goPrev"
        >
          <ArrowLeftIcon />
          上一题
        </Button>
        <span class="text-xs text-muted-foreground">
          本组已自评 {{ session.reviewedCount.value }} 题
        </span>
        <Button
          variant="ghost"
          size="sm"
          :disabled="session.index.value >= session.total.value - 1"
          @click="session.next()"
        >
          跳过
          <ArrowRightIcon />
        </Button>
      </div>
    </template>

    <p v-else class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      这组还没有关联题目。
    </p>
  </div>
</template>
