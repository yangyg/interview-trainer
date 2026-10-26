<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangleIcon,
  BookOpenIcon,
  ChevronRightIcon,
  CodeIcon,
  LightbulbIcon,
  ListChecksIcon,
  MessageSquareQuoteIcon,
  NetworkIcon,
  SparklesIcon,
  TableIcon,
  WorkflowIcon,
} from '@lucide/vue'
import LessonDiagram from '@/components/course/LessonDiagram.vue'
import HandwriteBlock from '@/components/course/HandwriteBlock.vue'
import RichText from '@/components/course/RichText.vue'
import { useDataStore } from '@/stores/data'
import type { LessonContent } from '@/lib/types'

const props = defineProps<{ content: LessonContent }>()

const dataStore = useDataStore()

const paragraphs = computed(() =>
  props.content.intro
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean),
)

const sections = computed(() => props.content.sections ?? [])

/** 真题拆解要显示题干,题干在题库里而不在课程 JSON 里,按 id 回查 */
function questionOf(id: string) {
  return dataStore.questionsById[id]
}

const HEAD_ICON = {
  concept: BookOpenIcon,
  why: LightbulbIcon,
  principle: WorkflowIcon,
  analogy: SparklesIcon,
  diagram: NetworkIcon,
  compare: TableIcon,
  code: CodeIcon,
} as const
</script>

<template>
  <div class="space-y-6">
    <!-- 导语 -->
    <div class="space-y-3 text-[15px] leading-7 text-foreground/90">
      <p v-for="(p, i) in paragraphs" :key="i"><RichText :text="p" /></p>
    </div>

    <!-- 知识骨架:讲义很长,先给一张地图 -->
    <div v-if="content.outline.length" class="rounded-xl border bg-muted/30 p-4">
      <p
        class="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        <ListChecksIcon class="size-3.5" />
        本课地图
      </p>
      <ul class="space-y-2">
        <li v-for="(item, i) in content.outline" :key="i" class="flex gap-2.5 text-sm leading-6">
          <span
            class="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold tabular-nums text-primary"
          >
            {{ i + 1 }}
          </span>
          <span class="min-w-0"><RichText :text="item" /></span>
        </li>
      </ul>
    </div>

    <!-- 教学主体 -->
    <template v-for="(block, bi) in sections" :key="bi">
      <div :id="`blk-${bi}`" class="scroll-mt-24">
      <!-- 概念 -->
      <section v-if="block.kind === 'concept'" class="space-y-2.5">
        <h3 class="flex items-start gap-2 text-[15px] font-semibold leading-6">
          <component :is="HEAD_ICON.concept" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0"><RichText :text="block.title" /></span>
        </h3>
        <p v-for="(p, i) in block.body" :key="i" class="text-[15px] leading-7 text-foreground/85">
          <RichText :text="p" />
        </p>
        <div
          v-if="block.term"
          class="rounded-lg border-l-[3px] border-primary/50 bg-primary/[0.05] py-2.5 pl-3.5 pr-3"
        >
          <p class="text-xs font-semibold text-primary"><RichText :text="block.term.name" /></p>
          <p class="mt-1 text-sm leading-6 text-foreground/85">
            <RichText :text="block.term.def" />
          </p>
        </div>
        <ul v-if="block.points?.length" class="space-y-1.5">
          <li
            v-for="(p, i) in block.points"
            :key="i"
            class="flex gap-2 text-sm leading-6 text-foreground/85"
          >
            <span class="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
            <span class="min-w-0"><RichText :text="p" /></span>
          </li>
        </ul>
      </section>

      <!-- 为什么 -->
      <section v-else-if="block.kind === 'why'" class="space-y-2.5">
        <h3 class="flex items-start gap-2 text-[15px] font-semibold leading-6">
          <component :is="HEAD_ICON.why" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0"><RichText :text="block.title" /></span>
        </h3>
        <p v-for="(p, i) in block.body" :key="i" class="text-[15px] leading-7 text-foreground/85">
          <RichText :text="p" />
        </p>
        <div v-if="block.without" class="rounded-lg border border-dashed px-3.5 py-2.5">
          <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            反过来说
          </p>
          <p class="mt-1 text-sm leading-6 text-foreground/85">
            <RichText :text="block.without" />
          </p>
        </div>
      </section>

      <!-- 原理:机制拆解 -->
      <section v-else-if="block.kind === 'principle'" class="space-y-3">
        <h3 class="flex items-start gap-2 text-[15px] font-semibold leading-6">
          <component :is="HEAD_ICON.principle" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0"><RichText :text="block.title" /></span>
        </h3>
        <p v-for="(p, i) in block.body" :key="`b${i}`" class="text-[15px] leading-7 text-foreground/85">
          <RichText :text="p" />
        </p>
        <ol class="space-y-0">
          <li v-for="(s, i) in block.steps" :key="i" class="flex gap-3">
            <div class="flex flex-col items-center">
              <span
                class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold tabular-nums text-primary"
              >
                {{ i + 1 }}
              </span>
              <span
                v-if="i < block.steps.length - 1"
                class="my-1 w-px flex-1 bg-border"
                aria-hidden="true"
              />
            </div>
            <div class="min-w-0 flex-1 pb-3.5">
              <p class="text-sm font-medium leading-6"><RichText :text="s.title" /></p>
              <p class="mt-0.5 text-sm leading-6 text-muted-foreground">
                <RichText :text="s.detail" />
              </p>
            </div>
          </li>
        </ol>
        <p
          v-if="block.takeaway"
          class="rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm font-medium leading-6"
        >
          <RichText :text="block.takeaway" />
        </p>
      </section>

      <!-- 类比 -->
      <section v-else-if="block.kind === 'analogy'" class="space-y-2.5">
        <h3 class="flex items-start gap-2 text-[15px] font-semibold leading-6">
          <component :is="HEAD_ICON.analogy" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0"><RichText :text="block.title" /></span>
        </h3>
        <div class="rounded-xl border bg-muted/35 p-4">
          <p class="text-[15px] leading-7 text-foreground/85"><RichText :text="block.text" /></p>
          <div
            v-if="block.mapping?.length"
            class="mt-3.5 space-y-1.5 border-t border-border/60 pt-3"
          >
            <div
              v-for="(m, i) in block.mapping"
              :key="i"
              class="flex flex-wrap items-center gap-1.5 text-xs leading-5"
            >
              <span class="text-muted-foreground"><RichText :text="m.real" /></span>
              <ChevronRightIcon class="size-3 shrink-0 text-muted-foreground/50" />
              <span class="font-medium text-foreground/85"><RichText :text="m.tech" /></span>
            </div>
          </div>
          <p
            v-if="block.limit"
            class="mt-3 border-t border-border/60 pt-2.5 text-[11px] leading-5 text-muted-foreground"
          >
            类比的边界:<RichText :text="block.limit" />
          </p>
        </div>
      </section>

      <!-- 图示 -->
      <section v-else-if="block.kind === 'diagram'" class="space-y-2.5">
        <h3 class="flex items-start gap-2 text-[15px] font-semibold leading-6">
          <component :is="HEAD_ICON.diagram" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0"><RichText :text="block.title" /></span>
        </h3>
        <p
          v-for="(p, i) in block.body"
          :key="`b${i}`"
          class="text-[15px] leading-7 text-foreground/85"
        >
          <RichText :text="p" />
        </p>
        <div class="rounded-xl border bg-card p-4">
          <LessonDiagram :diagram="block.diagram" />
        </div>
        <p
          v-if="block.caption"
          class="rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm leading-6 text-foreground/85"
        >
          <RichText :text="block.caption" />
        </p>
      </section>

      <!-- 对比 -->
      <section v-else-if="block.kind === 'compare'" class="space-y-2.5">
        <h3 class="flex items-start gap-2 text-[15px] font-semibold leading-6">
          <component :is="HEAD_ICON.compare" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0"><RichText :text="block.title" /></span>
        </h3>
        <p
          v-for="(p, i) in block.body"
          :key="`b${i}`"
          class="text-[15px] leading-7 text-foreground/85"
        >
          <RichText :text="p" />
        </p>
        <div class="overflow-x-auto rounded-xl border">
          <table class="w-full border-collapse text-left text-sm">
            <thead>
              <tr class="bg-muted/50">
                <th
                  v-for="(h, i) in block.head"
                  :key="i"
                  class="whitespace-nowrap border-b border-border/70 px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  <RichText :text="h" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in block.rows" :key="ri" class="border-b border-border/40 last:border-0">
                <td class="whitespace-nowrap px-3 py-2 text-[13px] font-medium">
                  <RichText :text="row[0]" />
                </td>
                <td
                  v-for="(cell, ci) in row.slice(1)"
                  :key="ci"
                  class="px-3 py-2 text-[13px] leading-6 text-muted-foreground"
                >
                  <RichText :text="cell" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="block.note" class="text-xs leading-5 text-muted-foreground">
          <RichText :text="block.note" />
        </p>
        <p
          v-if="block.caption"
          class="rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm leading-6 text-foreground/85"
        >
          <RichText :text="block.caption" />
        </p>
      </section>

      <!-- 代码 -->
      <section v-else-if="block.kind === 'code'" class="space-y-2.5">
        <h3 class="flex items-start gap-2 text-[15px] font-semibold leading-6">
          <component :is="HEAD_ICON.code" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0"><RichText :text="block.title" /></span>
        </h3>
        <div class="overflow-hidden rounded-lg border bg-muted/40">
          <div class="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
            <span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {{ block.lang }}
            </span>
            <span v-if="block.caption" class="min-w-0 truncate text-[11px] text-muted-foreground">
              <RichText :text="block.caption" />
            </span>
          </div>
          <pre
            class="overflow-x-auto p-3 font-mono text-xs leading-6 text-foreground/90"
          ><code>{{ block.code }}</code></pre>
        </div>
        <ul v-if="block.notes?.length" class="space-y-1.5">
          <li
            v-for="(n, i) in block.notes"
            :key="i"
            class="flex flex-wrap items-baseline gap-x-2 text-xs leading-5"
          >
            <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{{ n.line }}</code>
            <span class="min-w-0 text-muted-foreground"><RichText :text="n.text" /></span>
          </li>
        </ul>
      </section>

      <!-- 手写代码 -->
      <HandwriteBlock v-else-if="block.kind === 'handwrite'" :block="block" />

      <!-- 真题拆解 -->
      <section
        v-else-if="block.kind === 'question'"
        class="rounded-xl border border-primary/25 bg-primary/[0.04] p-4"
      >
        <div class="flex items-center gap-2">
          <MessageSquareQuoteIcon class="size-3.5 shrink-0 text-primary" />
          <span class="text-[11px] font-medium uppercase tracking-wider text-primary">
            真题拆解
          </span>
          <span class="text-[11px] text-muted-foreground">
            {{ questionOf(block.questionId)?.no ?? block.questionId }}
          </span>
        </div>
        <p class="mt-1.5 text-sm font-medium leading-6">
          {{ questionOf(block.questionId)?.title ?? block.title }}
        </p>

        <div class="mt-3 space-y-3">
          <div>
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              这一问在筛什么
            </p>
            <p class="mt-1 text-sm leading-6 text-foreground/85">
              <RichText :text="block.intent" />
            </p>
          </div>
          <div>
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              按这个顺序说
            </p>
            <ol class="mt-1 space-y-1.5">
              <li v-for="(p, i) in block.points" :key="i" class="flex gap-2 text-sm leading-6">
                <span class="shrink-0 font-mono text-[11px] text-primary/80">{{ i + 1 }}.</span>
                <span class="min-w-0 text-foreground/85"><RichText :text="p" /></span>
              </li>
            </ol>
          </div>
          <div v-if="block.depth" class="rounded-lg bg-background/60 px-3 py-2">
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              拉开分档的细节
            </p>
            <p class="mt-1 text-sm leading-6 text-foreground/85"><RichText :text="block.depth" /></p>
          </div>
          <div v-if="block.followup">
            <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              如果继续追问
            </p>
            <p class="mt-1 text-sm leading-6 text-foreground/85">
              <RichText :text="block.followup" />
            </p>
          </div>
        </div>
      </section>
      </div>
    </template>

    <!-- 坑 -->
    <div
      v-if="content.pitfalls.length"
      class="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4"
    >
      <p
        class="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400"
      >
        <AlertTriangleIcon class="size-3.5" />
        容易踩的坑
      </p>
      <ul class="space-y-1.5">
        <li
          v-for="(item, i) in content.pitfalls"
          :key="i"
          class="text-sm leading-6 text-amber-900/90 dark:text-amber-100/85"
        >
          <RichText :text="item" />
        </li>
      </ul>
    </div>
  </div>
</template>
