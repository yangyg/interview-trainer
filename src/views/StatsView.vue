<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useRouter } from 'vue-router'
import {
  AlarmClockIcon,
  CalendarCheckIcon,
  CircleCheckIcon,
  DownloadIcon,
  FileUpIcon,
  FlameIcon,
  TrendingDownIcon,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { VChart } from '@/lib/echarts'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/composables/useTheme'
import { useCourseStore } from '@/stores/course'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'

const dataStore = useDataStore()
const progress = useProgressStore()
const courseStore = useCourseStore()
const router = useRouter()
const { isDark } = useTheme()

const fileInput = ref<HTMLInputElement | null>(null)

const mastered = computed(() => progress.statusCounts.mastered)
const masteryPct = computed(() => (dataStore.total ? Math.round((mastered.value / dataStore.total) * 100) : 0))

// ---------- 专题堆积柱状图 ----------

const barOption = computed(() => {
  const topics = dataStore.topics
  const axisColor = isDark.value ? '#a1a1aa' : '#71717a'
  const splitColor = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const stat = (topicId: string, status: 'mastered' | 'fuzzy' | 'wrong') =>
    dataStore.questionsOf(topicId).filter((q) => progress.recordOf(q.id)?.status === status).length
  const seriesOf = (name: string, color: string, status: 'mastered' | 'fuzzy' | 'wrong') => ({
    name,
    type: 'bar' as const,
    stack: 'total',
    barMaxWidth: 26,
    itemStyle: { color, borderRadius: status === 'mastered' ? [3, 3, 0, 0] : 0 },
    data: topics.map((t) => stat(t.id, status)),
  })
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { textStyle: { color: axisColor, fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
    grid: { left: 8, right: 8, top: 32, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: topics.map((t) => t.name),
      axisLabel: { color: axisColor, fontSize: 10, interval: 0, rotate: 32, width: 80, overflow: 'truncate' },
      axisLine: { lineStyle: { color: splitColor } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: axisColor, fontSize: 10 },
      splitLine: { lineStyle: { color: splitColor } },
    },
    series: [
      seriesOf('已掌握', '#10b981', 'mastered'),
      seriesOf('模糊', '#f59e0b', 'fuzzy'),
      seriesOf('不会', '#ef4444', 'wrong'),
      {
        name: '未学习',
        type: 'bar',
        stack: 'total',
        barMaxWidth: 26,
        itemStyle: { color: isDark.value ? '#3f3f46' : '#e4e4e7', borderRadius: [3, 3, 0, 0] },
        data: topics.map((t) => t.count - stat(t.id, 'mastered') - stat(t.id, 'fuzzy') - stat(t.id, 'wrong')),
      },
    ],
  }
})

// ---------- 学习构成饼图 ----------

const pieOption = computed(() => {
  const axisColor = isDark.value ? '#a1a1aa' : '#71717a'
  const unseen = Math.max(0, dataStore.total - progress.learnedCount)
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: axisColor, fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: isDark.value ? '#18181b' : '#ffffff', borderWidth: 2 },
        label: { show: false },
        data: [
          { name: '已掌握', value: mastered.value, itemStyle: { color: '#10b981' } },
          { name: '模糊', value: progress.statusCounts.fuzzy, itemStyle: { color: '#f59e0b' } },
          { name: '不会', value: progress.statusCounts.wrong, itemStyle: { color: '#ef4444' } },
          { name: '未学习', value: unseen, itemStyle: { color: isDark.value ? '#3f3f46' : '#e4e4e7' } },
        ],
      },
    ],
  }
})

// ---------- 近 21 天热力 ----------

const recentDays = computed(() => {
  const max = Math.max(10, ...progress.recentDays(21).map((d) => d.studied + d.quiz))
  return progress.recentDays(21).map((d) => {
    const total = d.studied + d.quiz
    const level = total === 0 ? 0 : Math.min(4, Math.ceil((total / max) * 4))
    return { ...d, total, level }
  })
})

const levelCls = [
  'bg-muted',
  'bg-emerald-500/25',
  'bg-emerald-500/50',
  'bg-emerald-500/75',
  'bg-emerald-500',
]

// ---------- 薄弱专题 ----------

const weakTopics = computed(() => {
  return dataStore.topics
    .map((t) => {
      const qs = dataStore.questionsOf(t.id)
      const wrong = qs.filter((q) => progress.recordOf(q.id)?.status === 'wrong').length
      const fuzzy = qs.filter((q) => progress.recordOf(q.id)?.status === 'fuzzy').length
      const studied = qs.filter((q) => !!progress.recordOf(q.id)).length
      return {
        topic: t,
        wrong,
        fuzzy,
        studied,
        rate: studied ? (wrong + fuzzy) / studied : 0,
      }
    })
    .filter((t) => t.wrong + t.fuzzy > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 4)
})

// ---------- 数据导入导出 ----------

const lastSync = useLocalStorage<string | null>('interview-trainer/last-sync', null)

function exportData() {
  const blob = new Blob([progress.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interview-progress-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  lastSync.value = new Date().toISOString()
  toast.success('进度已导出为 JSON 备份')
}

function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const res = progress.importJson(String(reader.result ?? ''))
    if (res.ok) toast.success(res.message)
    else toast.error(res.message)
  }
  reader.readAsText(file)
}

function resetProgress() {
  progress.reset()
  // 课程完成度是另一份数据(course-v1);只清 SRS 会出现「课时已完成但题都没标过」的矛盾状态
  courseStore.resetAll()
  toast.success('学习进度已重置')
}
</script>

<template>
  <div>
    <div class="mb-4">
      <h1 class="text-xl font-semibold tracking-tight">学习统计</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">进度、薄弱点与数据备份(进度存于浏览器 localStorage)</p>
    </div>

    <!-- 概览卡片 -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CircleCheckIcon class="size-5" />
          </div>
          <div>
            <p class="text-2xl font-semibold tabular-nums">{{ mastered }}</p>
            <p class="text-xs text-muted-foreground">已掌握 / {{ dataStore.total }} 题({{ masteryPct }}%)</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex size-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <AlarmClockIcon class="size-5" />
          </div>
          <div>
            <p class="text-2xl font-semibold tabular-nums">{{ progress.dueIds.length }}</p>
            <p class="text-xs text-muted-foreground">今日待复习</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FlameIcon class="size-5" />
          </div>
          <div>
            <p class="text-2xl font-semibold tabular-nums">{{ progress.streak }}</p>
            <p class="text-xs text-muted-foreground">连续学习天数</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex size-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <CalendarCheckIcon class="size-5" />
          </div>
          <div>
            <p class="text-2xl font-semibold tabular-nums">{{ progress.todayStudied }}</p>
            <p class="text-xs text-muted-foreground">今日已学题数</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="mt-3 grid gap-3 lg:grid-cols-3">
      <!-- 专题堆积图 -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="text-base">各专题掌握情况</CardTitle>
          <CardDescription>按「已掌握 / 模糊 / 不会 / 未学习」堆积</CardDescription>
        </CardHeader>
        <CardContent>
          <VChart :option="barOption" autoresize class="h-80!" />
        </CardContent>
      </Card>

      <!-- 构成饼图 + 热力 -->
      <div class="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">学习构成</CardTitle>
          </CardHeader>
          <CardContent>
            <VChart :option="pieOption" autoresize class="h-52!" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle class="text-base">近 21 天学习热力</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex flex-wrap gap-1.5">
              <div
                v-for="d in recentDays"
                :key="d.date"
                class="size-6 rounded-sm"
                :class="levelCls[d.level]"
                :title="`${d.date}:学习 ${d.studied} / 模考 ${d.quiz}`"
              />
            </div>
            <p class="mt-3 text-xs text-muted-foreground">颜色越深,当天学习量越大</p>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- 薄弱专题 -->
    <Card class="mt-3">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <TrendingDownIcon class="size-4 text-muted-foreground" />
          薄弱专题
        </CardTitle>
        <CardDescription>按「模糊 + 不会」占已学比例排序,建议优先重刷</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!weakTopics.length" class="py-4 text-center text-sm text-muted-foreground">
          暂无薄弱专题数据,先去刷几题吧。
        </div>
        <div v-else class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="w in weakTopics"
            :key="w.topic.id"
            type="button"
            class="rounded-lg border p-3 text-left transition-colors hover:bg-accent"
            @click="router.push({ name: 'browse', query: { lang: w.topic.language, topic: w.topic.id, filter: 'wrong' } })"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-medium">{{ w.topic.name }}</span>
              <Badge variant="outline" class="shrink-0 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">
                {{ Math.round(w.rate * 100) }}% 薄弱
              </Badge>
            </div>
            <Progress :model-value="w.rate * 100" class="mt-2 h-1.5 [&>div]:bg-red-500" />
            <p class="mt-2 text-xs text-muted-foreground">
              不会 {{ w.wrong }} · 模糊 {{ w.fuzzy }} · 已学 {{ w.studied }}/{{ w.topic.count }}
            </p>
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- 数据管理 -->
    <Card class="mt-3">
      <CardHeader>
        <CardTitle class="text-base">数据备份</CardTitle>
        <CardDescription>
          学习进度保存在当前浏览器;换设备或清理浏览器前请先导出
          <template v-if="lastSync"> · 上次导出 {{ lastSync.slice(0, 10) }}</template>
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap items-center gap-2">
        <Button variant="outline" @click="exportData">
          <DownloadIcon />
          导出进度
        </Button>
        <Button variant="outline" @click="fileInput?.click()">
          <FileUpIcon />
          导入进度
        </Button>
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onImportFile">

        <AlertDialog>
          <AlertDialogTrigger as-child>
            <Button variant="ghost" class="ml-auto text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400">
              重置全部进度
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定重置全部学习进度?</AlertDialogTitle>
              <AlertDialogDescription>
                所有「掌握 / 模糊 / 不会」标记、学习统计与课程课时完成记录将被清空且不可恢复。如需保留,请先导出备份。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="resetProgress">
                确认重置
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  </div>
</template>
