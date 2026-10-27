<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  AlarmClockIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CircleCheckIcon,
  FileTextIcon,
  FlameIcon,
  LayersIcon,
  RouteIcon,
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
import { useCourseStore } from "@/stores/course";
import { useDataStore } from "@/stores/data";
import { useProgressStore } from "@/stores/progress";
import { LANG_META, LANGUAGES } from "@/lib/langs";
import type { Language } from "@/lib/types";

const router = useRouter();
const dataStore = useDataStore();
const progress = useProgressStore();
const courseStore = useCourseStore();

const masteryPct = computed(() =>
  dataStore.total
    ? Math.round((progress.statusCounts.mastered / dataStore.total) * 100)
    : 0,
);

const topTab = ref("java");
const topList = computed(
  () =>
    dataStore.index?.topLists[topTab.value as Language] ?? [],
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

// ---------- 继续学习 ----------
const resume = computed(() => courseStore.continueTarget);
const resumeCourse = computed(() =>
  resume.value ? courseStore.summaryOf(resume.value.courseId) : undefined,
);
const resumeLesson = computed(() => {
  const t = resume.value;
  if (!t) return null;
  return (
    courseStore.flatLessons(t.courseId).find((x) => x.lesson.id === t.lessonId)
      ?.lesson ?? null
  );
});
const resumeProgress = computed(() =>
  resume.value
    ? courseStore.courseProgress(resume.value.courseId)
    : { done: 0, total: 0, pct: 0 },
);

// 只想显示课时标题,但标题在课程 JSON 里,所以按需加载这一门(~30KB)
watch(
  () => resume.value?.courseId,
  (id) => {
    if (id) void courseStore.loadCourse(id);
  },
  { immediate: true },
);

function goResume() {
  const t = resume.value;
  if (!t) return;
  router.push({
    name: "course-lesson",
    params: { courseId: t.courseId, lessonId: t.lessonId },
  });
}

/** 有高频榜的语言(arch 等新语言未必有) */
const topLangs = computed(() =>
  LANGUAGES.filter((l) => (dataStore.index?.topLists[l]?.length ?? 0) > 0),
);
function topCount(l: Language) {
  return dataStore.index?.topLists[l]?.length ?? 0;
}

/** 数据源描述:随语言列表自动扩展,避免新增语言时漏改文案 */
const sourceLine = computed(() => LANGUAGES.map((l) => LANG_META[l].label).join(" / "));

const countLine = computed(() =>
  LANGUAGES.map((l) => `${LANG_META[l].label} ${dataStore.index?.counts[l] ?? 0}`).join(" · "),
);

function langCard(language: Language) {
  const topics = dataStore.topicsOf(language);
  const total = dataStore.index?.counts[language] ?? 0;
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
            数据源:本地 {{ sourceLine }} 题库文档 · 更新于
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
          <p class="text-xs text-muted-foreground">{{ countLine }}</p>
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

    <!-- 学习路径:有历史就续上,没历史就引导到第一课 -->
    <Card v-if="resume && resumeCourse" class="overflow-hidden">
      <CardContent class="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
          :class="LANG_META[resumeCourse.language].badge"
        >
          <RouteIcon class="size-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-[11px] uppercase tracking-wider text-muted-foreground">
            {{ resumeLesson ? "继续上次的课时" : "从学习路径开始" }}
          </p>
          <p class="mt-0.5 truncate text-sm font-medium">
            {{ resumeCourse.title
            }}<template v-if="resumeLesson"> · {{ resumeLesson.title }}</template>
          </p>
          <div class="mt-2 flex items-center gap-2">
            <Progress :model-value="resumeProgress.pct" class="h-1.5 max-w-56" />
            <span class="text-[11px] tabular-nums text-muted-foreground">
              {{ resumeProgress.done }}/{{ resumeProgress.total }} 课时
            </span>
          </div>
        </div>
        <div class="flex shrink-0 gap-2">
          <Button size="sm" @click="goResume">
            继续学习
            <ArrowRightIcon />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            @click="router.push({ name: 'courses' })"
          >
            全部课程
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- 语言专题 -->
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="lang in LANGUAGES"
        :key="lang"
        class="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <CardHeader class="pb-3">
          <div class="flex items-center gap-2.5">
            <span
              class="flex size-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              :class="LANG_META[lang].badge"
            >
              {{ LANG_META[lang].short }}
            </span>
            <div>
              <CardTitle class="text-base">{{
                LANG_META[lang].title
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
                <TabsTrigger
                  v-for="l in topLangs"
                  :key="l"
                  :value="l"
                  class="px-2.5 text-xs"
                >
                  {{ LANG_META[l].label }} Top {{ topCount(l) }}
                </TabsTrigger>
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
              :class="LANG_META[d.language].badge"
            >
              {{ LANG_META[d.language].short }}
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
