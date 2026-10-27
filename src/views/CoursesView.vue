<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RouteIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CourseCard from '@/components/course/CourseCard.vue'
import { LANG_META, LANGUAGES } from '@/lib/langs'
import { useCourseStore } from '@/stores/course'
import type { CourseSummary, Language } from '@/lib/types'

const route = useRoute()
const router = useRouter()
const courseStore = useCourseStore()

// ---------- 路由状态 ----------

/** 与「题库浏览」保持一致:语言筛选落在 URL 上(/courses?lang=go),可分享、可前进后退 */
type LangFilter = 'all' | Language

function isLangFilter(v: unknown): v is LangFilter {
  return v === 'all' || (typeof v === 'string' && LANGUAGES.includes(v as Language))
}

const tab = computed<LangFilter>({
  get: () => {
    const q = route.query.lang
    return isLangFilter(q) ? q : 'java'
  },
  set: (v) => {
    // 默认值 java 不写进 URL,保持 /courses 干净;其余值显式带上
    router.replace({ query: { ...route.query, lang: v === 'java' ? undefined : v } })
  },
})

function setTab(v: string) {
  // 忽略非法/空值:Tabs 在挂载阶段可能发出空串,直接回落成 java 会冲掉 URL 上的筛选
  if (isLangFilter(v)) tab.value = v
}

const list = computed<CourseSummary[]>(() => {
  if (tab.value === 'all') {
    return LANGUAGES.flatMap((l) => courseStore.coursesOf(l))
  }
  return courseStore.coursesOf(tab.value)
})

/** 当前筛选范围内的整体进度(课程未加载时用完成记录条数兜底) */
const overall = computed(() => {
  let done = 0
  let total = 0
  for (const c of list.value) {
    const p = courseStore.courseProgress(c.id)
    done += p.done
    total += p.total
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
})

const languageCount = computed(() => {
  const out = { all: courseStore.courses.length } as Record<LangFilter, number>
  for (const l of LANGUAGES) out[l] = courseStore.coursesOf(l).length
  return out
})

const loading = computed(() => !courseStore.isIndexReady && !courseStore.indexError)
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-balance text-xl font-semibold tracking-tight">学习路径</h1>
        <p class="mt-0.5 max-w-prose text-sm text-muted-foreground">
          {{ courseStore.courses.length }} 门课按「由浅入深」排好序:每课时先讲清一张知识地图,再用关联真题逐题自评。
          课时全部自评即完成,继续解锁下一课。
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span class="tabular-nums">{{ overall.done }}/{{ overall.total }} 课时</span>
        <Progress :model-value="overall.pct" class="h-1.5 w-24" />
        <span class="tabular-nums">{{ overall.pct }}%</span>
      </div>
    </div>

    <Tabs :model-value="tab" class="mb-4" @update:model-value="setTab(String($event))">
      <TabsList>
        <TabsTrigger value="all">全部 {{ languageCount.all }}</TabsTrigger>
        <TabsTrigger v-for="l in LANGUAGES" :key="l" :value="l">
          {{ LANG_META[l].label }} {{ languageCount[l] }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- 索引加载中 -->
    <div v-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="i in 6" :key="i" class="h-44 rounded-xl" />
    </div>

    <!-- 索引加载失败 -->
    <div v-else-if="courseStore.indexError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
      课程数据加载失败:{{ courseStore.indexError }}
      <p class="mt-1 text-xs text-muted-foreground">
        请确认已运行 <code class="rounded bg-muted px-1">npm run courses</code> 生成课程 JSON。
      </p>
      <Button variant="outline" size="sm" class="mt-3" @click="courseStore.init()">重试</Button>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CourseCard v-for="c in list" :key="c.id" :course="c" />
    </div>

    <div class="mt-6 rounded-lg border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
      <p class="mb-1 flex items-center gap-1.5 font-medium text-foreground">
        <RouteIcon class="size-3.5" />
        怎么用这条路径
      </p>
      时间紧就按「语言 → 课程顺序」推进,每课 8-12 分钟;面到某一块被问倒时,回到对应课程按阶段补。
      课时完成度与背题卡片是两套独立记录:课时看的是「这组题是否都自评过」,间隔复习仍由背题页单独推送。
    </div>
  </div>
</template>
