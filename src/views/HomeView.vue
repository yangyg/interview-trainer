<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  AlarmClockIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CircleCheckIcon,
  FileTextIcon,
  FlameIcon,
  LayersIcon,
  TimerIcon,
  TrendingUpIcon,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/stores/data";
import { useProgressStore } from "@/stores/progress";
import type { Language } from "@/lib/types";

const router = useRouter();
const dataStore = useDataStore();
const progress = useProgressStore();

const masteryPct = computed(() =>
  dataStore.total
    ? Math.round((progress.statusCounts.mastered / dataStore.total) * 100)
    : 0,
);

const topTab = ref("java");
const topList = computed(
  () => dataStore.index?.topLists[topTab.value as "java" | "go"] ?? [],
);

function topicLearned(topicId: string): number {
  return dataStore.questionsOf(topicId).filter((q) => !!progress.recordOf(q.id))
    .length;
}

function goTopic(id: string) {
  router.push({ name: "browse", query: { topic: id } });
}

function goTop(item: { questionId?: string | null }) {
  if (!item.questionId) return;
  const q = dataStore.questionsById[item.questionId];
  if (q)
    router.push({
      name: "browse",
      query: { lang: q.language, topic: q.topicId, q: q.id },
    });
}

function openDoc(id: string) {
  router.push({ name: "doc", params: { id } });
}

function langCard(language: Language) {
  const topics =
    language === "java" ? dataStore.javaTopics : dataStore.goTopics;
  const total =
    language === "java"
      ? (dataStore.index?.counts.java ?? 0)
      : (dataStore.index?.counts.go ?? 0);
  const learned = topics.reduce((sum, t) => sum + topicLearned(t.id), 0);
  return { topics, total, learned };
}
</script>

<template>
  <div class="space-y-6">
    <!-- 顶部概览 -->
    <div class="relative overflow-hidden rounded-2xl border bg-card">
      <div
        class="bg-grid pointer-events-none absolute inset-0"
        aria-hidden="true"
      ></div>
      <div
        class="relative flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8"
      >
        <div class="max-w-2xl">
          <p
            class="mb-2 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground"
          >
            Interview Trainer ·
            {{
              new Date(dataStore.index?.generatedAt ?? Date.now()).getFullYear()
            }}
          </p>
          <h1
            class="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            面试<span class="brand-gradient-text">刷题</span>工作台
          </h1>
          <p
            class="mt-2.5 max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground"
          >
            {{ dataStore.total }} 道真题,按间隔重复安排复习,模拟真实面试节奏。
            数据源:本地 Java / Golang 面试题库文档 · 更新于
            {{ dataStore.index?.generatedAt.slice(0, 10) }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button @click="router.push({ name: 'flashcards' })">
            <LayersIcon />
            开始背题
          </Button>
          <Button variant="outline" @click="router.push({ name: 'quiz' })">
            <TimerIcon />
            模拟面试
          </Button>
        </div>
      </div>
    </div>

    <!-- 指标条 -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        class="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground">题库总量</p>
            <BookOpenIcon class="size-4 text-muted-foreground" />
          </div>
          <p class="mt-1.5 text-2xl font-semibold tabular-nums">
            {{ dataStore.total }}
          </p>
          <p class="text-xs text-muted-foreground">
            Java {{ dataStore.index?.counts.java }} · Go
            {{ dataStore.index?.counts.go }}
          </p>
        </CardContent>
      </Card>
      <Card
        class="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground">已掌握</p>
            <CircleCheckIcon class="size-4 text-emerald-500" />
          </div>
          <p class="mt-1.5 text-2xl font-semibold tabular-nums">
            {{ progress.statusCounts.mastered }}
          </p>
          <Progress
            :model-value="masteryPct"
            class="mt-2 h-1.5 [&>div]:bg-emerald-500"
          />
        </CardContent>
      </Card>
      <Card
        class="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-md"
        @click="router.push({ name: 'flashcards', query: { pool: 'due' } })"
      >
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground">今日待复习</p>
            <AlarmClockIcon class="size-4 text-orange-500" />
          </div>
          <p class="mt-1.5 text-2xl font-semibold tabular-nums">
            {{ progress.dueIds.length }}
          </p>
          <p class="text-xs text-muted-foreground">点击开始复习到期卡片</p>
        </CardContent>
      </Card>
      <Card
        class="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground">连续学习</p>
            <TrendingUpIcon class="size-4 text-cyan-500" />
          </div>
          <p class="mt-1.5 text-2xl font-semibold tabular-nums">
            {{ progress.streak }} 天
          </p>
          <p class="text-xs text-muted-foreground">
            今日已学 {{ progress.todayStudied }} 题
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- 语言专题 -->
    <div class="grid gap-3 lg:grid-cols-2">
      <Card
        v-for="lang in ['java', 'go'] as Language[]"
        :key="lang"
        class="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <CardHeader class="pb-3">
          <div class="flex items-center gap-2.5">
            <span
              class="flex size-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              :class="lang === 'java' ? 'bg-amber-500' : 'bg-cyan-600'"
            >
              {{ lang === "java" ? "J" : "Go" }}
            </span>
            <div>
              <CardTitle class="text-base">{{
                lang === "java" ? "Java 后端" : "Golang 后端"
              }}</CardTitle>
              <CardDescription
                >{{ langCard(lang).total }} 题 · 已学
                {{ langCard(lang).learned }} 题</CardDescription
              >
            </div>
          </div>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-1.5">
          <button
            v-for="t in langCard(lang).topics"
            :key="t.id"
            type="button"
            class="group rounded-md border px-2.5 py-1.5 text-left transition-all hover:border-foreground/20 hover:bg-accent"
            @click="goTopic(t.id)"
          >
            <span class="flex items-center gap-1.5 text-xs font-medium">
              {{ t.name }}
              <span
                class="text-[10px] tabular-nums"
                :class="
                  topicLearned(t.id) === t.count
                    ? 'text-emerald-500'
                    : 'text-muted-foreground'
                "
              >
                {{ topicLearned(t.id) }}/{{ t.count }}
              </span>
            </span>
          </button>
        </CardContent>
      </Card>
    </div>

    <!-- 高频榜 + 资料 -->
    <div class="grid gap-3 lg:grid-cols-5">
      <Card class="lg:col-span-3">
        <CardHeader class="pb-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <CardTitle class="flex items-center gap-2 text-base">
              <FlameIcon class="size-4 text-orange-500" />
              高频题速查
            </CardTitle>
            <Tabs v-model="topTab">
              <TabsList class="h-7">
                <TabsTrigger value="java" class="px-2.5 text-xs"
                  >Java Top 30</TabsTrigger
                >
                <TabsTrigger value="go" class="px-2.5 text-xs"
                  >Go Top 10</TabsTrigger
                >
              </TabsList>
            </Tabs>
          </div>
          <CardDescription>来自 README 跨面经统计,点击直达题目</CardDescription>
        </CardHeader>
        <CardContent class="p-0">
          <div class="max-h-96 overflow-y-auto">
            <button
              v-for="item in topList"
              :key="item.rank"
              type="button"
              class="flex w-full items-center gap-3 border-t px-4 py-2.5 text-left transition-colors first:border-t-0 hover:bg-accent/60"
              :class="!item.questionId && 'cursor-default'"
              @click="goTop(item)"
            >
              <span
                class="flex size-5.5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                :class="
                  cn(
                    item.rank <= 3
                      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                      : 'bg-muted text-muted-foreground',
                  )
                "
              >
                {{ item.rank }}
              </span>
              <span class="min-w-0 flex-1 truncate text-sm">{{
                item.title
              }}</span>
              <span
                v-if="item.location || item.note"
                class="hidden shrink-0 text-xs text-muted-foreground sm:block"
              >
                {{ item.location ?? item.note }}
              </span>
              <ArrowRightIcon
                v-if="item.questionId"
                class="size-3.5 shrink-0 text-muted-foreground"
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader class="pb-2">
          <CardTitle class="flex items-center gap-2 text-base">
            <FileTextIcon class="size-4 text-muted-foreground" />
            面经与资料
          </CardTitle>
          <CardDescription>原始文档整卷阅读</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-2">
          <button
            v-for="d in dataStore.index?.docs ?? []"
            :key="d.id"
            type="button"
            class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
            @click="openDoc(d.id)"
          >
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
              :class="d.language === 'java' ? 'bg-amber-500' : 'bg-cyan-600'"
            >
              {{ d.language === "java" ? "J" : "Go" }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium">{{
                d.title
              }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{
                d.description
              }}</span>
            </span>
            <ArrowRightIcon class="size-3.5 shrink-0 text-muted-foreground" />
          </button>
          <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
            提示:「真实面经汇编」里每家公司附「风格点评」,模拟面试前值得一读
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
