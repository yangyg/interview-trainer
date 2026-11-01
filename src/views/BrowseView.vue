<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterIcon,
  RotateCcwIcon,
  SearchXIcon,
  SparklesIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BottomSheet, QuestionDetailLayer, SegmentedTabs } from '@/components/mobile'
import { AiChatPanel } from '@/components/ai'
import AnswerBody from '@/components/AnswerBody.vue'
import EmptyState from '@/components/EmptyState.vue'
import QuestionMeta from '@/components/QuestionMeta.vue'
import StatusActions from '@/components/StatusActions.vue'
import { cn } from '@/lib/utils'
import { LANG_META, LANGUAGES } from '@/lib/langs'
import { usePlatform } from '@/composables/usePlatform'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'
import type { Language, Question, Topic } from '@/lib/types'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const progress = useProgressStore()
const { isMobile } = usePlatform()

// ---------- 路由状态 ----------

const lang = computed<string>({
  get: () => {
    const t = route.query.lang as string
    if (LANGUAGES.includes(t as Language)) return t
    return currentTopic.value?.language ?? 'java'
  },
  set: (v) => {
    // 切语言时自动选中该语言第一个专题,避免列表区空白
    const first = dataStore.topicsOf(v as Language)[0]?.id
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

// 首次进入:选中「当前语言下」的第一个专题(带 ?lang=arch 进来时不能落到 java-01)
watch(
  () => dataStore.isReady,
  (ready) => {
    if (ready && !topicId.value) {
      const first = dataStore.topicsOf(lang.value as Language)[0]?.id ?? dataStore.topics[0]?.id
      router.replace({ query: { ...route.query, topic: first } })
    }
  },
  { immediate: true },
)

function selectTopic(t: Topic) {
  router.replace({ query: { ...route.query, lang: t.language, topic: t.id, q: undefined } })
}

/** 从列表点进详情:push 留历史,返回时才能恢复列表滚动位置 */
function openQuestion(q: Question) {
  router.push({ query: { ...route.query, q: q.id } })
}

function closeQuestion() {
  // 有历史则回退(恢复列表滚动),直达链接落地时退化为 replace
  if (window.history.state?.back) router.back()
  else router.replace({ query: { ...route.query, q: undefined } })
}

// ---------- 筛选 ----------

const textFilter = ref('')
const chapterFilter = ref('all')
const frequencyFilter = ref('all')
const statusFilter = ref('all')
const filterOpen = ref(false)
const aiOpen = ref(false)

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

/** 生效中的筛选条件数,给移动端筛选按钮加角标 */
const activeFilterCount = computed(
  () =>
    (textFilter.value ? 1 : 0) +
    (chapterFilter.value !== 'all' ? 1 : 0) +
    (frequencyFilter.value !== 'all' ? 1 : 0) +
    (statusFilter.value !== 'all' ? 1 : 0),
)

function resetFilters() {
  textFilter.value = ''
  chapterFilter.value = 'all'
  frequencyFilter.value = 'all'
  statusFilter.value = 'all'
}

const selected = computed<Question | undefined>(() => {
  const id = questionId.value
  return id ? dataStore.questionsById[id] : undefined
})

const selectedIndex = computed(() => {
  if (!selected.value) return -1
  return filtered.value.findIndex((q) => q.id === selected.value!.id)
})

/** 上一题/下一题:原地换题不产生历史 */
function stepQuestion(delta: number) {
  const idx = selectedIndex.value + delta
  const next = filtered.value[idx]
  if (next) router.replace({ query: { ...route.query, q: next.id } })
}

function topicProgress(t: Topic): { learned: number; total: number; pct: number } {
  const total = t.count
  const learned = dataStore.questionsOf(t.id).filter((q) => !!progress.recordOf(q.id)).length
  return { learned, total, pct: total ? Math.round((learned / total) * 100) : 0 }
}

const langTopics = computed(() => dataStore.topicsOf(lang.value as Language))

const langOptions = LANGUAGES.map((l) => ({ value: l, label: LANG_META[l].label }))
</script>

<template>
  <div>
    <div class="mb-4 hidden flex-wrap items-center justify-between gap-3 lg:flex">
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
      <aside class="hidden w-56 shrink-0 flex-col gap-3 self-start lg:sticky lg:top-14 lg:flex lg:max-h-[calc(100vh-3.5rem)]">
        <Tabs :model-value="lang" @update:model-value="lang = String($event)">
          <TabsList class="w-full">
            <TabsTrigger v-for="l in LANGUAGES" :key="l" :value="l" class="flex-1">
              {{ LANG_META[l].label }}
            </TabsTrigger>
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
        <!-- 移动端:语言分段 + 专题横滑 chips + 筛选弹层入口 -->
        <div class="mb-3 flex flex-col gap-2 lg:hidden">
          <SegmentedTabs :options="langOptions" :model-value="lang" @update:model-value="lang = String($event)" />
          <div class="flex items-center gap-2">
            <nav class="-mx-1 min-w-0 flex-1 overflow-x-auto px-1" aria-label="专题">
              <div class="flex w-max items-center gap-1.5 py-0.5">
                <button
                  v-for="t in langTopics"
                  :key="t.id"
                  type="button"
                  :class="cn(
                    'pressable whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition-colors',
                    topicId === t.id
                      ? 'border-transparent bg-primary font-medium text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground',
                  )"
                  @click="selectTopic(t)"
                >
                  {{ t.name }}
                  <span class="ml-0.5 text-[11px] opacity-70">{{ t.count }}</span>
                </button>
              </div>
            </nav>
            <Button variant="outline" class="pressable relative shrink-0" aria-label="筛选" @click="filterOpen = true">
              <ListFilterIcon />
              筛选
              <span
                v-if="activeFilterCount"
                class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
              >{{ activeFilterCount }}</span>
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">共 {{ filtered.length }} 题 · 点击题目查看详解</p>
        </div>

        <!-- 题目详情(桌面:内嵌卡片) -->
        <template v-if="selected && !isMobile">
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
                <div class="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" @click="aiOpen = true">
                    <SparklesIcon />
                    AI 助手
                  </Button>
                  <StatusActions :question-id="selected.id" compact />
                </div>
              </div>
            </div>
            <div class="p-4 sm:p-5">
              <AnswerBody :question="selected" />
            </div>
          </div>
        </template>

        <!-- 题目列表 -->
        <template v-else-if="currentTopic">
          <!-- 桌面筛选行 -->
          <div class="mb-3 hidden flex-wrap items-center gap-2 lg:flex">
            <div class="min-w-0 flex-1 basis-44">
              <Input v-model="textFilter" placeholder="按标题过滤…" class="h-8" aria-label="按标题过滤" />
            </div>
            <Select v-model="chapterFilter">
              <SelectTrigger size="sm" class="w-36" aria-label="章节">
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
              <SelectTrigger size="sm" class="w-28" aria-label="频率">
                <SelectValue placeholder="频率" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">频率不限</SelectItem>
                <SelectItem value="3">🔥 高频</SelectItem>
                <SelectItem value="2">🔥≥2</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="statusFilter">
              <SelectTrigger size="sm" class="w-28" aria-label="掌握状态">
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

          <div v-else class="overflow-hidden rounded-2xl bg-card shadow-xs lg:rounded-xl lg:shadow-none lg:border">
            <button
              v-for="(q, i) in filtered"
              :key="q.id"
              type="button"
              :class="cn(
                'group flex w-full items-center gap-3 border-b px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/60 active:bg-accent/60 lg:py-2.5',
                i % 2 === 1 && 'bg-muted/30',
              )"
              @click="openQuestion(q)"
            >
              <span class="w-12 shrink-0 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground/70">{{ q.no }}</span>
              <span class="min-w-0 flex-1 truncate text-sm">{{ q.title }}</span>
              <span class="shrink-0">
                <QuestionMeta :question="q" show-status />
              </span>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- 移动端筛选弹层 -->
    <BottomSheet v-model:open="filterOpen" title="筛选">
      <div class="flex flex-col gap-4 py-1">
        <label class="flex flex-col gap-1.5 text-sm">
          标题关键字
          <Input v-model="textFilter" placeholder="按标题过滤…" class="h-10" aria-label="按标题过滤" />
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          章节
          <Select v-model="chapterFilter">
            <SelectTrigger class="h-10 w-full" aria-label="章节">
              <SelectValue placeholder="章节" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部章节</SelectItem>
              <SelectItem v-for="c in chapterOptions" :key="c.name" :value="c.name">
                {{ c.name }}({{ c.count }})
              </SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          频率
          <Select v-model="frequencyFilter">
            <SelectTrigger class="h-10 w-full" aria-label="频率">
              <SelectValue placeholder="频率" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">频率不限</SelectItem>
              <SelectItem value="3">🔥 高频</SelectItem>
              <SelectItem value="2">🔥≥2</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          掌握状态
          <Select v-model="statusFilter">
            <SelectTrigger class="h-10 w-full" aria-label="掌握状态">
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
        </label>
        <Button variant="ghost" class="pressable" @click="resetFilters">
          <RotateCcwIcon />
          重置筛选
        </Button>
      </div>
      <div class="sticky bottom-0 bg-background py-3">
        <Button class="pressable w-full" size="lg" @click="filterOpen = false">
          查看 {{ filtered.length }} 题
        </Button>
      </div>
    </BottomSheet>

    <!-- 移动端全屏详情层:卡片堆叠,左滑下一题/右滑上一题(见 QuestionDetailLayer) -->
    <Teleport to="body">
      <Transition name="layer">
        <div
          v-if="selected && isMobile"
          class="fixed inset-0 z-40 flex flex-col bg-background"
          role="dialog"
          aria-label="题目详情"
        >
          <QuestionDetailLayer
            :question="selected"
            :index="selectedIndex"
            :total="filtered.length"
            :topic-name="dataStore.topicName(selected.topicId)"
            :chapter="selected.chapter"
            @close="closeQuestion"
            @step="stepQuestion"
            @ai="aiOpen = true"
          />
        </div>
      </Transition>
    </Teleport>

    <!-- AI 助手:移动端全高底部弹层,桌面保持居中对话框 -->
    <template v-if="selected">
      <BottomSheet
        v-if="isMobile"
        v-model:open="aiOpen"
        :title="`AI 助手 · ${selected.no}`"
        content-class="overflow-hidden"
      >
        <div class="flex h-[80svh] flex-col">
          <AiChatPanel :question="selected" />
        </div>
      </BottomSheet>
      <Dialog v-else v-model:open="aiOpen">
        <DialogContent class="flex h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader v-if="selected" class="border-b px-4 py-3">
            <DialogTitle class="truncate pr-6 text-sm">{{ selected.title }}</DialogTitle>
            <DialogDescription class="text-xs">
              {{ dataStore.topicName(selected.topicId) }} · {{ selected.chapter }} · AI 生成内容仅供参考
            </DialogDescription>
          </DialogHeader>
          <div v-if="selected" class="min-h-0 flex-1">
            <AiChatPanel :question="selected" />
          </div>
        </DialogContent>
      </Dialog>
    </template>
  </div>
</template>

<style scoped>
/* 移动端全屏详情层:从右滑入/滑出( reduced-motion 由全局降级块接管) */
.layer-enter-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.layer-leave-active {
  transition: transform 0.24s cubic-bezier(0.32, 0.72, 0, 1);
}
.layer-enter-from,
.layer-leave-to {
  transform: translateX(100%);
}
</style>
