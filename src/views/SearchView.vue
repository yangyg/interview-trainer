<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SearchXIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EmptyState from '@/components/EmptyState.vue'
import QuestionMeta from '@/components/QuestionMeta.vue'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'
import { LANG_META, LANGUAGES } from '@/lib/langs'
import type { Language, Question } from '@/lib/types'

const router = useRouter()
const dataStore = useDataStore()
const progress = useProgressStore()

const query = ref('')
const lang = ref('all')
const topicId = ref('all')
const frequency = ref('all')
const statusFilter = ref('all')

const topicOptions = computed(() =>
  lang.value === 'all' ? dataStore.topics : dataStore.topicsOf(lang.value as Language),
)

const results = computed<Question[]>(() => {
  let list: Question[]
  if (query.value.trim()) {
    list = dataStore.searchQuestions(query.value, 200)
  } else {
    list = dataStore.allQuestions
  }
  if (lang.value !== 'all') list = list.filter((q) => q.language === lang.value)
  if (topicId.value !== 'all') list = list.filter((q) => q.topicId === topicId.value)
  if (frequency.value === '3') list = list.filter((q) => (q.frequency ?? 0) >= 3)
  else if (frequency.value === '2') list = list.filter((q) => (q.frequency ?? 0) >= 2)
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

function openQuestion(q: Question) {
  router.push({ name: 'browse', query: { lang: q.language, topic: q.topicId, q: q.id } })
}
</script>

<template>
  <div>
    <div class="mb-4">
      <h1 class="text-xl font-semibold tracking-tight">搜索</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        全文检索全部 {{ dataStore.total }} 道题的标题与答案,支持中文关键词
      </p>
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <div class="min-w-0 flex-1 basis-56">
          <Input v-model="query" placeholder="搜索关键词,如:HashMap、GC、B+ 树…" class="h-9" autofocus />
        </div>
        <Tabs v-model="lang">
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger v-for="l in LANGUAGES" :key="l" :value="l">
              {{ LANG_META[l].label }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Select v-model="topicId">
          <SelectTrigger size="sm" class="w-44">
            <SelectValue placeholder="专题" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部专题</SelectItem>
            <SelectItem v-for="t in topicOptions" :key="t.id" :value="t.id">{{ t.name }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="frequency">
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
        <Badge variant="secondary">{{ results.length }} 条结果</Badge>
      </div>

      <EmptyState
        v-if="query && !results.length"
        :icon="SearchXIcon"
        title="没有匹配的题目"
        description="换个关键词试试,中文支持任意连续两字匹配。"
      />

      <div v-else class="overflow-hidden rounded-xl border">
        <button
          v-for="q in results.slice(0, 100)"
          :key="q.id"
          type="button"
          class="group flex w-full flex-col gap-1.5 border-b px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/60"
          @click="openQuestion(q)"
        >
          <div class="flex w-full items-center gap-3">
            <span class="w-12 shrink-0 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground/70">{{ q.no }}</span>
            <span class="min-w-0 flex-1 truncate text-sm transition-transform duration-150 group-hover:translate-x-0.5">{{ q.title }}</span>
            <span class="shrink-0 text-xs text-muted-foreground">{{ dataStore.topicName(q.topicId) }}</span>
          </div>
          <div class="pl-[60px]">
            <QuestionMeta :question="q" show-status />
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
