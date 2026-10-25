<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRightIcon, NotebookIcon, RefreshCwIcon, Trash2Icon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import EmptyState from '@/components/EmptyState.vue'
import { dueText } from '@/lib/srs'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'
import type { Question } from '@/lib/types'

const router = useRouter()
const dataStore = useDataStore()
const progress = useProgressStore()

const wrongQuestions = computed<Question[]>(() =>
  progress.wrongIds
    .map((id) => dataStore.questionsById[id])
    .filter((q): q is Question => !!q),
)

function openQuestion(q: Question) {
  router.push({ name: 'browse', query: { lang: q.language, topic: q.topicId, q: q.id } })
}

function restudy() {
  router.push({ name: 'flashcards', query: { pool: 'wrong' } })
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">错题本</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">
          自评「不会」的题目共 {{ wrongQuestions.length }} 道,重刷后自评「会」即可移出
        </p>
      </div>
      <Button v-if="wrongQuestions.length" @click="restudy">
        <RefreshCwIcon />
        开始重刷
      </Button>
    </div>

    <EmptyState
      v-if="!wrongQuestions.length"
      :icon="NotebookIcon"
      title="错题本是空的"
      description="在背题、模考或浏览中自评「不会」的题目会自动收进这里。"
    >
      <Button variant="outline" @click="router.push({ name: 'quiz' })">先来一场模拟面试</Button>
    </EmptyState>

    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle class="text-base">待攻克题目</CardTitle>
          <CardDescription>点击题目查看详解;下次复习时间由间隔重复算法安排</CardDescription>
        </CardHeader>
        <CardContent class="p-0">
          <div
            v-for="q in wrongQuestions"
            :key="q.id"
            class="flex items-center gap-3 border-t px-4 py-3 first:border-t-0"
          >
            <div class="min-w-0 flex-1">
              <button type="button" class="block max-w-full truncate text-left text-sm hover:underline" @click="openQuestion(q)">
                {{ q.title }}
              </button>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {{ dataStore.topicName(q.topicId) }} · {{ q.no }}
                <template v-if="progress.recordOf(q.id)"> · 下次复习 {{ dueText(progress.recordOf(q.id)!.due) }}</template>
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" title="移出错题本" @click="progress.removeRecord(q.id)">
              <Trash2Icon />
            </Button>
            <Button variant="ghost" size="icon-sm" title="查看详解" @click="openQuestion(q)">
              <ArrowRightIcon />
            </Button>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
