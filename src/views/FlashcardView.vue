<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  EyeIcon,
  LayersIcon,
  RotateCcwIcon,
  SparklesIcon,
  XIcon,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AnswerBody from '@/components/AnswerBody.vue'
import EmptyState from '@/components/EmptyState.vue'
import QuestionMeta from '@/components/QuestionMeta.vue'
import StatusActions from '@/components/StatusActions.vue'
import { dueText } from '@/lib/srs'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'
import type { GradeResult, Question } from '@/lib/types'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const progress = useProgressStore()

// ---------- 配置 ----------

const lang = ref('all')
const topicId = ref('all')
const frequency = ref('all')
const pool = ref('all')
const count = ref('20')
const order = ref('random')

const topicOptions = computed(() => {
  const list =
    lang.value === 'all'
      ? dataStore.topics
      : lang.value === 'go'
        ? dataStore.goTopics
        : lang.value === 'ai'
          ? dataStore.aiTopics
          : dataStore.javaTopics
  return list
})

const matched = computed<Question[]>(() => {
  let list = dataStore.allQuestions
  if (lang.value !== 'all') list = list.filter((q) => q.language === lang.value)
  if (topicId.value !== 'all') list = list.filter((q) => q.topicId === topicId.value)
  if (frequency.value === '3') list = list.filter((q) => (q.frequency ?? 0) >= 3)
  else if (frequency.value === '2') list = list.filter((q) => (q.frequency ?? 0) >= 2)
  const now = Date.now()
  if (pool.value === 'unseen') list = list.filter((q) => !progress.recordOf(q.id))
  else if (pool.value === 'due') list = list.filter((q) => { const r = progress.recordOf(q.id); return !!r && r.due <= now })
  else if (pool.value !== 'all') list = list.filter((q) => progress.recordOf(q.id)?.status === pool.value)
  return list
})

// ---------- 会话 ----------

const session = ref<Question[] | null>(null)
const index = ref(0)
const flipped = ref(false)
const results = ref<{ mastered: number; fuzzy: number; wrong: number }>({ mastered: 0, fuzzy: 0, wrong: 0 })

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function start(initial?: Question[]) {
  let cards = initial ?? matched.value
  if (!initial && order.value === 'random') cards = shuffle(cards)
  if (!initial && count.value !== '0') cards = cards.slice(0, Number(count.value))
  if (!cards.length) return
  session.value = cards
  index.value = 0
  flipped.value = false
  results.value = { mastered: 0, fuzzy: 0, wrong: 0 }
}

function stop() {
  session.value = null
  flipped.value = false
}

function grade(result: GradeResult) {
  const q = session.value?.[index.value]
  if (!q) return
  progress.grade(q.id, result)
  results.value[result] += 1
  index.value += 1
  flipped.value = false
}

const current = computed(() => session.value?.[index.value])
const sessionList = computed(() => session.value ?? [])
const finished = computed(() => !!session.value && index.value >= session.value.length)
const sessionProgress = computed(() =>
  session.value ? Math.round((Math.min(index.value, session.value.length) / session.value.length) * 100) : 0,
)

// 键盘操作:空格翻卡,1/2/3 评分
function onKeydown(e: KeyboardEvent) {
  if (!session.value || finished.value) return
  if (e.code === 'Space') {
    e.preventDefault()
    if (!flipped.value) flipped.value = true
    return
  }
  if (flipped.value) {
    if (e.key === '1') grade('mastered')
    else if (e.key === '2') grade('fuzzy')
    else if (e.key === '3') grade('wrong')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // 支持外部直达:首页「待复习」、错题本「重刷」等 (?pool=due|wrong|fuzzy|unseen)
  const p = route.query.pool
  if (typeof p === 'string' && ['due', 'wrong', 'fuzzy', 'unseen'].includes(p) && dataStore.isReady) {
    pool.value = p
    start(matched.value)
    router.replace({ query: {} })
  }
})
</script>

<template>
  <div>
    <div class="mb-4">
      <h1 class="text-balance text-xl font-semibold tracking-tight">背题卡片</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        翻卡自评,答对升盒、答错回炉;间隔 1/2/4/7/15/30 天循环推送
      </p>
    </div>

    <!-- 配置 -->
    <Card v-if="!session" class="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <LayersIcon class="size-4 text-muted-foreground" />
          选择卡组
        </CardTitle>
        <CardDescription>当前范围内匹配 {{ matched.length }} 张卡片</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground">语言</p>
            <Tabs v-model="lang">
              <TabsList class="w-full">
                <TabsTrigger value="all" class="flex-1">全部</TabsTrigger>
                <TabsTrigger value="java" class="flex-1">Java</TabsTrigger>
                <TabsTrigger value="go" class="flex-1">Golang</TabsTrigger>
                <TabsTrigger value="ai" class="flex-1">AI</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground">专题</p>
            <Select v-model="topicId">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部专题</SelectItem>
                <SelectItem v-for="t in topicOptions" :key="t.id" :value="t.id">{{ t.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground">频率</p>
            <Select v-model="frequency">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">频率不限</SelectItem>
                <SelectItem value="3">仅高频(🔥≥3)</SelectItem>
                <SelectItem value="2">中频以上(🔥≥2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground">卡片池</p>
            <Select v-model="pool">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题目</SelectItem>
                <SelectItem value="unseen">未学习</SelectItem>
                <SelectItem value="due">今日待复习</SelectItem>
                <SelectItem value="fuzzy">标记模糊的</SelectItem>
                <SelectItem value="wrong">标记不会的</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground">数量</p>
            <Select v-model="count">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 张</SelectItem>
                <SelectItem value="20">20 张</SelectItem>
                <SelectItem value="50">50 张</SelectItem>
                <SelectItem value="0">全部</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground">顺序</p>
            <Select v-model="order">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">随机</SelectItem>
                <SelectItem value="seq">按题库顺序</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <Button :disabled="!matched.length" @click="start()">
            <SparklesIcon />
            开始背题
          </Button>
          <Button
            variant="outline"
            :disabled="!progress.dueIds.length"
            @click="pool = 'due'; start(dataStore.allQuestions.filter((q) => {
              const r = progress.recordOf(q.id)
              return !!r && r.due <= Date.now()
            }))"
          >
            <RotateCcwIcon />
            复习到期卡片({{ progress.dueIds.length }})
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- 会话 -->
    <div v-else class="mx-auto max-w-3xl">
      <div class="mb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" title="结束本轮" @click="stop">
          <XIcon />
        </Button>
        <Progress :model-value="sessionProgress" class="flex-1" />
        <span class="shrink-0 text-xs text-muted-foreground">
          {{ Math.min(index + (finished ? 0 : 1), sessionList.length) }} / {{ sessionList.length }}
        </span>
      </div>

      <!-- 总结 -->
      <Card v-if="finished">
        <CardHeader>
          <CardTitle class="text-base">本轮完成 🎉</CardTitle>
          <CardDescription>自评 {{ sessionList.length }} 张:会 {{ results.mastered }} · 模糊 {{ results.fuzzy }} · 不会 {{ results.wrong }}</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-2">
          <Button variant="outline" @click="stop">再配一组</Button>
          <Button
            v-if="results.wrong + results.fuzzy > 0"
            @click="start(sessionList.filter((q) => {
              const r = progress.recordOf(q.id)
              return r && (r.status === 'wrong' || r.status === 'fuzzy')
            }))"
          >
            <RotateCcwIcon />
            重刷本轮 {{ results.wrong + results.fuzzy }} 张
          </Button>
        </CardContent>
      </Card>

      <!-- 卡片 -->
      <Card v-else-if="current" class="mx-auto min-h-[50vh]">
        <CardHeader class="gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <QuestionMeta :question="current" />
            <Badge v-if="progress.recordOf(current.id)" variant="outline" class="text-xs text-muted-foreground">
              盒级 {{ progress.recordOf(current.id)!.box }} · 下次 {{ dueText(progress.recordOf(current.id)!.due) }}
            </Badge>
          </div>
          <CardTitle class="text-lg leading-snug">{{ current.title }}</CardTitle>
        </CardHeader>
        <CardContent class="flip-perspective">
          <Transition name="flip" mode="out-in">
            <div v-if="flipped" key="answer" class="space-y-4">
              <AnswerBody :question="current" />
              <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <span class="text-xs text-muted-foreground">自评(快捷键 1 / 2 / 3)</span>
                <StatusActions :question-id="current.id" compact @graded="grade" />
              </div>
            </div>
            <div v-else key="front" class="flex flex-col items-center gap-3 py-10">
              <Button size="lg" @click="flipped = true">
                <EyeIcon />
                显示答案
              </Button>
              <p class="text-xs text-muted-foreground">先自己作答,再对照要点(空格键翻卡)</p>
            </div>
          </Transition>
        </CardContent>
      </Card>
    </div>

    <!-- 空池提示 -->
    <EmptyState
      v-if="!session && !matched.length"
      class="mx-auto mt-4 max-w-2xl"
      :icon="LayersIcon"
      title="当前范围没有卡片"
      description="放宽筛选条件,或先把题目池改为「全部题目」。"
    />
  </div>
</template>
