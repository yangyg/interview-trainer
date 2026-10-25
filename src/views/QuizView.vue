<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  CheckCircle2Icon,
  EyeIcon,
  GraduationCapIcon,
  PlayIcon,
  RotateCcwIcon,
  TimerIcon,
  XCircleIcon,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import QuestionMeta from '@/components/QuestionMeta.vue'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'
import type { GradeResult, Question } from '@/lib/types'

const dataStore = useDataStore()
const progress = useProgressStore()
const router = useRouter()

// ---------- 配置 ----------

const lang = ref('all')
const topicId = ref('all')
const frequency = ref('all')
const count = ref('10')
const timerSec = ref('120')
const includeAlgorithm = ref(true)
const includeCodeOutput = ref(true)

const topicOptions = computed(() =>
  lang.value === 'all' ? dataStore.topics : lang.value === 'go' ? dataStore.goTopics : dataStore.javaTopics,
)

const matched = computed<Question[]>(() => {
  let list = dataStore.allQuestions
  if (lang.value !== 'all') list = list.filter((q) => q.language === lang.value)
  if (topicId.value !== 'all') list = list.filter((q) => q.topicId === topicId.value)
  if (frequency.value === '3') list = list.filter((q) => (q.frequency ?? 0) >= 3)
  else if (frequency.value === '2') list = list.filter((q) => (q.frequency ?? 0) >= 2)
  if (!includeAlgorithm.value) list = list.filter((q) => q.topicId !== 'java-11' && !q.tags.includes('算法'))
  if (!includeCodeOutput.value) list = list.filter((q) => !q.tags.includes('代码输出题'))
  return list
})

// ---------- 会话 ----------

const session = ref<Question[] | null>(null)
const index = ref(0)
const revealed = ref(false)
const timeLeft = ref(0)
const timeUp = ref(false)
const results = ref<{ q: Question; grade: GradeResult }[]>([])

let timer: ReturnType<typeof setInterval> | null = null

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startTimer() {
  stopTimer()
  if (timerSec.value === '0') {
    timeLeft.value = 0
    timeUp.value = false
    return
  }
  timeLeft.value = Number(timerSec.value)
  timeUp.value = false
  timer = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value -= 1
      if (timeLeft.value === 0) timeUp.value = true
    }
  }, 1000)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function start(initial?: Question[]) {
  const cards = shuffle(initial ?? matched.value).slice(0, Number(count.value))
  if (!cards.length) return
  session.value = cards
  index.value = 0
  revealed.value = false
  results.value = []
  startTimer()
}

function stop() {
  stopTimer()
  session.value = null
}

function grade(result: GradeResult) {
  const q = session.value?.[index.value]
  if (!q) return
  progress.grade(q.id, result, 'quiz')
  results.value.push({ q, grade: result })
  stopTimer()
  if (index.value < (session.value?.length ?? 0) - 1) {
    index.value += 1
    revealed.value = false
    startTimer()
  } else {
    index.value += 1
  }
}

const current = computed(() => session.value?.[index.value])
const sessionList = computed(() => session.value ?? [])
const finished = computed(() => !!session.value && index.value >= session.value.length)
const sessionProgress = computed(() =>
  session.value ? Math.round((Math.min(index.value, session.value.length) / session.value.length) * 100) : 0,
)
const score = computed(() => results.value.filter((r) => r.grade === 'mastered').length)

const timerPct = computed(() => {
  const total = Number(timerSec.value)
  if (!total) return 100
  return Math.max(0, Math.round((timeLeft.value / total) * 100))
})

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`
}

watch([current, revealed], ([, rev]) => {
  // 揭示答案后停止计时
  if (rev) stopTimer()
})

onBeforeUnmount(stopTimer)
</script>

<template>
  <div>
    <div class="mb-4">
      <h1 class="text-balance text-xl font-semibold tracking-tight">模拟面试</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        随机抽题限时作答,先自己讲一遍,再对照参考答案自评
      </p>
    </div>

    <!-- 配置 -->
    <Card v-if="!session" class="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <GraduationCapIcon class="size-4 text-muted-foreground" />
          配置一场模拟面试
        </CardTitle>
        <CardDescription>当前范围可抽 {{ matched.length }} 题</CardDescription>
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
            <p class="text-xs font-medium text-muted-foreground">题量</p>
            <Select v-model="count">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 题(约 25 分钟)</SelectItem>
                <SelectItem value="20">20 题(约 50 分钟)</SelectItem>
                <SelectItem value="30">30 题(约 75 分钟)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground">每题限时</p>
            <Select v-model="timerSec">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">不限时</SelectItem>
                <SelectItem value="60">1 分钟</SelectItem>
                <SelectItem value="120">2 分钟</SelectItem>
                <SelectItem value="300">5 分钟</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-3">
            <p class="text-xs font-medium text-muted-foreground">题型</p>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="includeAlgorithm" />
              含算法手撕题
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="includeCodeOutput" />
              含代码输出题
            </label>
          </div>
        </div>

        <Button :disabled="!matched.length" @click="start()">
          <PlayIcon />
          开始面试
        </Button>
      </CardContent>
    </Card>

    <!-- 会话 -->
    <div v-else class="mx-auto max-w-3xl">
      <div class="mb-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" @click="stop">放弃</Button>
        <Progress :model-value="sessionProgress" class="flex-1" />
        <span class="shrink-0 text-xs text-muted-foreground">
          {{ Math.min(index + 1, sessionList.length) }} / {{ sessionList.length }}
        </span>
      </div>

      <!-- 总结 -->
      <template v-if="finished">
        <Card class="mb-4">
          <CardHeader>
            <CardTitle class="text-base">面试结束</CardTitle>
            <CardDescription>
              自评通过 {{ score }} / {{ results.length }}(会计为通过,模糊/不会计入错题)
            </CardDescription>
          </CardHeader>
          <CardContent class="flex flex-wrap gap-2">
            <Button variant="outline" @click="stop">再配一场</Button>
            <Button
              v-if="results.some((r) => r.grade !== 'mastered')"
              @click="start(results.filter((r) => r.grade !== 'mastered').map((r) => r.q))"
            >
              <RotateCcwIcon />
              重刷本题库({{ results.filter((r) => r.grade !== 'mastered').length }})
            </Button>
          </CardContent>
        </Card>

        <div class="overflow-hidden rounded-xl border">
          <div
            v-for="(r, i) in results"
            :key="r.q.id"
            class="flex items-center gap-3 border-b bg-card px-3.5 py-2.5 last:border-b-0"
          >
            <component
              :is="r.grade === 'mastered' ? CheckCircle2Icon : XCircleIcon"
              :class="r.grade === 'mastered' ? 'size-4 shrink-0 text-emerald-500' : 'size-4 shrink-0 text-red-500'"
            />
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-sm hover:underline"
              @click="router.push({ name: 'browse', query: { topic: r.q.topicId, q: r.q.id } })"
            >
              {{ r.q.title }}
            </button>
            <Badge variant="secondary" class="shrink-0">
              {{ r.grade === 'mastered' ? '会' : r.grade === 'fuzzy' ? '模糊' : '不会' }}
            </Badge>
            <span class="hidden shrink-0 text-xs text-muted-foreground sm:block">#{{ i + 1 }}</span>
          </div>
        </div>
      </template>

      <!-- 答题 -->
      <Card v-else-if="current">
        <CardHeader class="gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <QuestionMeta :question="current" />
            <div v-if="Number(timerSec) > 0" class="flex items-center gap-2 text-sm tabular-nums">
              <TimerIcon :class="timeUp ? 'size-4 text-red-500' : 'size-4 text-muted-foreground'" />
              <span :class="timeUp ? 'font-medium text-red-500' : ''">
                {{ timeUp ? '时间到' : fmtTime(timeLeft) }}
              </span>
            </div>
          </div>
          <div v-if="Number(timerSec) > 0" class="h-1 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full transition-all duration-1000"
              :class="timerPct > 20 ? 'bg-primary' : 'bg-red-500'"
              :style="{ width: `${timerPct}%` }"
            />
          </div>
          <CardTitle class="text-lg leading-snug">{{ current.title }}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <template v-if="revealed">
            <AnswerBody :question="current" />
            <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span class="text-xs text-muted-foreground">对照要点自评(计入学习记录)</span>
              <div class="flex gap-2">
                <Button size="sm" variant="outline" class="border-emerald-500/40 text-emerald-600 dark:text-emerald-400" @click="grade('mastered')">
                  <CheckCircle2Icon />
                  会
                </Button>
                <Button size="sm" variant="outline" class="border-amber-500/40 text-amber-600 dark:text-amber-400" @click="grade('fuzzy')">
                  模糊
                </Button>
                <Button size="sm" variant="outline" class="border-red-500/40 text-red-600 dark:text-red-400" @click="grade('wrong')">
                  <XCircleIcon />
                  不会
                </Button>
              </div>
            </div>
          </template>
          <div v-else class="flex flex-col items-center gap-3 py-10">
            <Button size="lg" @click="revealed = true">
              <EyeIcon />
              作答完毕,查看参考答案
            </Button>
            <p class="text-xs text-muted-foreground">建议先口述「结论 → 原理 → 对比 → 举例」再对照</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
