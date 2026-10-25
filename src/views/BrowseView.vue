<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterIcon,
  SearchXIcon,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { cn } from '@/lib/utils'
import { LANG_META } from '@/lib/langs'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'
import type { Question, Topic } from '@/lib/types'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const progress = useProgressStore()

// ---------- 路由状态 ----------

const lang = computed<string>({
  get: () => {
    const t = route.query.lang as string
    if (t === 'java' || t === 'go' || t === 'ai') return t
    return currentTopic.value?.language ?? 'java'
  },
  set: (v) => {
    // 切语言时自动选中该语言第一个专题,避免列表区空白
    const first = (v === 'go' ? dataStore.goTopics : v === 'ai' ? dataStore.aiTopics : dataStore.javaTopics)[0]?.id
    router.replace({ query: { ...route.query, lang: v, topic: first, q: undefined } })
  },
})

const topicId = computed<string | undefined>({
  get: () => (route.query.topic as string) || undefined,
  set: (v) => {
    router.replace({ query: { ...route.query, topic: v, q: undefined } })
  },
})

const currentTopic = computed<Topic | undefined>(() => {
  const id = topicId.value
  if (id) return dataStore.topics.find((t) => t.id === id)
  return undefined
})

const questionId = computed<string | undefined>(() => (route.query.q as string) || undefined)

// 首次进入:选中第一个专题
watch(
  () => dataStore.isReady,
  (ready) => {
    if (ready && !topicId.value) {
      router.replace({ query: { ...route.query, topic: dataStore.topics[0]?.id } })
    }
  },
  { immediate: true },
)

function selectTopic(t: Topic) {
  router.replace({ query: { ...route.query, lang: t.language, topic: t.id, q: undefined } })
}

function openQuestion(q: Question) {
  router.replace({ query: { ...route.query, q: q.id } })
}

function closeQuestion() {
  router.replace({ query: { ...route.query, q: undefined } })
}

// ---------- 筛选 ----------

const textFilter = ref('')
const chapterFilter = ref('all')
const frequencyFilter = ref('all')
const statusFilter = ref('all')

// 支持外部跳转带 filter=wrong 等初始状态
const VALID_STATUS = ['all', 'unseen', 'mastered', 'fuzzy', 'wrong', 'due']
watch(
  () => route.query.filter,
  (f) => {
    if (typeof f === 'string' && VALID_STATUS.includes(f)) statusFilter.value = f
  },
  { immediate: true },
)

watch(topicId, () => {
  chapterFilter.value = 'all'
  textFilter.value = ''
})

const chapterOptions = computed(() => currentTopic.value?.chapters ?? [])

const questions = computed<Question[]>(() =>
  topicId.value ? dataStore.questionsOf(topicId.value) : [],
)

const filtered = computed(() => {
  let list = questions.value
  const kw = textFilter.value.trim().toLowerCase()
  if (kw) list = list.filter((q) => q.title.toLowerCase().includes(kw) || q.no.toLowerCase() === kw)
  if (chapterFilter.value !== 'all') list = list.filter((q) => q.chapter === chapterFilter.value)
  if (frequencyFilter.value === '3') list = list.filter((q) => (q.frequency ?? 0) >= 3)
  else if (frequencyFilter.value === '2') list = list.filter((q) => (q.frequency ?? 0) >= 2)
  if (statusFilter.value !== 'all') {
    const now = Date.now()
    list = list.filter((q) => {
      const r = progress.recordOf(q.id)
      if (statusFilter.value === 'unseen') return !r
      if (statusFilter.value === 'due') return !!r && r.due <= now
      return r?.status === statusFilter.value
    })
  }
  return list
})

const selected = computed<Question | undefined>(() => {
  const id = questionId.value
  return id ? dataStore.questionsById[id] : undefined
})

const selectedIndex = computed(() => {
  if (!selected.value) return -1
  return filtered.value.findIndex((q) => q.id === selected.value!.id)
})

function stepQuestion(delta: number) {
  const idx = selectedIndex.value + delta
  const next = filtered.value[idx]
  if (next) openQuestion(next)
}

function topicProgress(t: Topic): { learned: number; total: number; pct: number } {
  const total = t.count
  const learned = dataStore.questionsOf(t.id).filter((q) => !!progress.recordOf(q.id)).length
  return { learned, total, pct: total ? Math.round((learned / total) * 100) : 0 }
}

const langTopics = computed(() =>
  lang.value === 'go' ? dataStore.goTopics : lang.value === 'ai' ? dataStore.aiTopics : dataStore.javaTopics,
)
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-balance text-xl font-semibold tracking-tight">题库浏览</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">
          共 {{ dataStore.total }} 题 · 点击题目查看详解并标记掌握状态
        </p>
      </div>
    </div>

    <div class="flex gap-5">
      <!-- 专题栏(桌面) -->
      <!-- self-start + sticky:长列表滚动时专题栏吸顶;max-h 保证内部导航可独立滚动 -->
      <aside class="hidden w-56 shrink-0 flex-col gap-3 self-start md:sticky md:top-14 md:flex md:max-h-[calc(100vh-3.5rem)]">
        <Tabs :model-value="lang" @update:model-value="lang = String($event)">
          <TabsList class="w-full">
            <TabsTrigger value="java" class="flex-1">Java</TabsTrigger>
            <TabsTrigger value="go" class="flex-1">Golang</TabsTrigger>
            <TabsTrigger value="ai" class="flex-1">AI</TabsTrigger>
          </TabsList>
        </Tabs>

        <nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-8">
          <button
            v-for="t in langTopics"
            :key="t.id"
            type="button"
            :class="cn(
              'group rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-accent',
              topicId === t.id && 'border-border bg-accent',
            )"
            @click="selectTopic(t)"
          >
            <div class="flex items-baseline justify-between gap-2">
              <span class="truncate text-sm font-medium" :title="t.name">{{ t.name }}</span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ t.count }}</span>
            </div>
            <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full"
                :class="LANG_META[t.language].bar"
                :style="{ width: `${topicProgress(t).pct}%` }"
              />
            </div>
          </button>
        </nav>
      </aside>

      <!-- 主区 -->
      <div class="min-w-0 flex-1">
        <!-- 移动端专题选择 -->
        <div class="mb-3 flex gap-2 md:hidden">
          <Tabs :model-value="lang" class="shrink-0" @update:model-value="lang = String($event)">
            <TabsList>
              <TabsTrigger value="java">Java</TabsTrigger>
              <TabsTrigger value="go">Golang</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select :model-value="topicId" @update:model-value="topicId = String($event)">
            <SelectTrigger class="min-w-0 flex-1">
              <SelectValue placeholder="选择专题" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="t in langTopics" :key="t.id" :value="t.id">{{ t.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 题目详情 -->
        <template v-if="selected">
          <div class="mb-3 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" @click="closeQuestion">
              <ArrowLeftIcon />
              返回列表
            </Button>
            <div class="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                :disabled="selectedIndex <= 0"
                title="上一题"
                @click="stepQuestion(-1)"
              >
                <ChevronLeftIcon />
              </Button>
              <span class="min-w-16 text-center text-xs text-muted-foreground">
                {{ selectedIndex + 1 }} / {{ filtered.length }}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                :disabled="selectedIndex < 0 || selectedIndex >= filtered.length - 1"
                title="下一题"
                @click="stepQuestion(1)"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>

          <div class="rounded-xl border bg-card">
            <div class="space-y-3 border-b p-4 sm:p-5">
              <p class="text-xs text-muted-foreground">
                {{ dataStore.topicName(selected.topicId) }} · {{ selected.chapter }} · {{ selected.no }}
              </p>
              <h2 class="text-base font-semibold leading-snug sm:text-lg">{{ selected.title }}</h2>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <QuestionMeta :question="selected" show-status />
                <StatusActions :question-id="selected.id" compact />
              </div>
            </div>
            <div class="p-4 sm:p-5">
              <AnswerBody :question="selected" />
            </div>
          </div>
        </template>

        <!-- 题目列表 -->
        <template v-else-if="currentTopic">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <div class="min-w-0 flex-1 basis-44">
              <Input v-model="textFilter" placeholder="按标题过滤…" class="h-8" />
            </div>
            <Select v-model="chapterFilter">
              <SelectTrigger size="sm" class="w-36">
                <SelectValue placeholder="章节" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部章节</SelectItem>
                <SelectItem v-for="c in chapterOptions" :key="c.name" :value="c.name">
                  {{ c.name }}({{ c.count }})
                </SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="frequencyFilter">
              <SelectTrigger size="sm" class="w-28">
                <SelectValue placeholder="频率" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">频率不限</SelectItem>
                <SelectItem value="3">🔥 高频</SelectItem>
                <SelectItem value="2">🔥≥2</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="statusFilter">
              <SelectTrigger size="sm" class="w-28">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">状态不限</SelectItem>
                <SelectItem value="unseen">未学习</SelectItem>
                <SelectItem value="mastered">已掌握</SelectItem>
                <SelectItem value="fuzzy">模糊</SelectItem>
                <SelectItem value="wrong">不会</SelectItem>
                <SelectItem value="due">待复习</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" class="gap-1">
              <ListFilterIcon class="size-3" />
              {{ filtered.length }} 题
            </Badge>
          </div>

          <div v-if="!filtered.length" class="space-y-3">
            <EmptyState
              :icon="SearchXIcon"
              title="没有符合条件的题目"
              description="试试放宽筛选条件,或切换其他专题。"
            />
          </div>

          <div v-else class="overflow-hidden rounded-xl border">
            <button
              v-for="(q, i) in filtered"
              :key="q.id"
              type="button"
              :class="cn(
                'group flex w-full items-center gap-3 border-b px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/60',
                i % 2 === 1 && 'bg-muted/30',
              )"
              @click="openQuestion(q)"
            >
              <span class="w-12 shrink-0 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground/70">{{ q.no }}</span>
              <span class="min-w-0 flex-1 truncate text-sm transition-transform duration-150 group-hover:translate-x-0.5">{{ q.title }}</span>
              <span class="hidden shrink-0 sm:block">
                <QuestionMeta :question="q" show-status />
              </span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
