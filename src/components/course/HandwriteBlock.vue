<script setup lang="ts">
import { ref } from 'vue'
import { CodeIcon, PencilRulerIcon, TriangleAlertIcon } from '@lucide/vue'
import RichText from '@/components/course/RichText.vue'
import type { LessonBlock } from '@/lib/types'

/** 只接受 handwrite 变体,便于模板里直接取字段 */
type HandwriteBlock = Extract<LessonBlock, { kind: 'handwrite' }>

defineProps<{ block: HandwriteBlock }>()

/** 骨架与答案默认都收起:先让人自己想,再对照 */
const showSkeleton = ref(false)
const showSolution = ref(false)
</script>

<template>
  <section class="rounded-xl border border-border/80 bg-card p-4">
    <div class="flex flex-wrap items-center gap-2">
      <PencilRulerIcon class="size-3.5 shrink-0 text-primary" />
      <span class="text-xs font-medium text-primary">手写代码</span>
      <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] leading-none text-muted-foreground">
        {{ block.lang }}
      </span>
    </div>
    <h2 class="mt-1.5 text-[15px] font-semibold leading-6"><RichText :text="block.title" /></h2>

    <!-- 题干:面试官会怎么问 -->
    <p class="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-6 text-foreground/85">
      <RichText :text="block.prompt" />
    </p>

    <!-- 方法签名:先定接口,再写实现 -->
    <div v-if="block.signature" class="mt-2.5">
      <p class="mb-1 text-xs font-medium text-muted-foreground">
        方法签名
      </p>
      <pre
        class="overflow-x-auto rounded-md border border-border/60 bg-muted/35 px-3 py-2 font-mono text-[11px] leading-6 text-foreground/90"
      ><code>{{ block.signature }}</code></pre>
    </div>

    <!-- 思路:按顺序讲给面试官听 -->
    <div class="mt-3">
      <p class="mb-1.5 text-xs font-medium text-muted-foreground">
        思路(边写边说)
      </p>
      <ol class="space-y-0">
        <li v-for="(s, i) in block.plan" :key="i" class="flex gap-2.5">
          <div class="flex flex-col items-center">
            <span
              class="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold tabular-nums text-primary"
            >
              {{ i + 1 }}
            </span>
            <span
              v-if="i < block.plan.length - 1"
              class="my-0.5 w-px flex-1 bg-border"
              aria-hidden="true"
            />
          </div>
          <div class="min-w-0 flex-1 pb-2.5">
            <p class="text-[13px] font-medium leading-6">{{ s.title }}</p>
            <p class="mt-0.5 text-[12px] leading-5 text-muted-foreground">
              <RichText :text="s.detail" />
            </p>
          </div>
        </li>
      </ol>
    </div>

    <!-- 折叠区:骨架 / 参考实现 -->
    <div class="mt-1 space-y-2">
      <div v-if="block.skeleton" class="overflow-hidden rounded-lg border border-border/60">
        <button
          type="button"
          class="flex w-full items-center gap-1.5 bg-muted/40 px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-muted/70"
          :aria-expanded="showSkeleton"
          @click="showSkeleton = !showSkeleton"
        >
          <CodeIcon class="size-3 shrink-0 text-muted-foreground" />
          骨架(留了 TODO,先自己填)
          <span class="ml-auto text-[11px] font-normal text-muted-foreground">
            {{ showSkeleton ? '收起' : '展开' }}
          </span>
        </button>
        <pre
          v-show="showSkeleton"
          class="overflow-x-auto border-t border-border/60 bg-muted/20 p-3 font-mono text-[11px] leading-6 text-foreground/90"
        ><code>{{ block.skeleton }}</code></pre>
      </div>

      <div class="overflow-hidden rounded-lg border border-primary/25">
        <button
          type="button"
          class="flex w-full items-center gap-1.5 bg-primary/[0.06] px-3 py-2 text-left text-[12px] font-medium text-primary transition-colors hover:bg-primary/10"
          :aria-expanded="showSolution"
          @click="showSolution = !showSolution"
        >
          <CodeIcon class="size-3 shrink-0" />
          参考实现
          <span class="ml-auto text-[11px] font-normal text-muted-foreground">
            {{ showSolution ? '收起' : '展开' }}
          </span>
        </button>
        <pre
          v-show="showSolution"
          class="overflow-x-auto border-t border-primary/20 bg-primary/[0.04] p-3 font-mono text-[11px] leading-6 text-foreground/90"
        ><code>{{ block.solution }}</code></pre>
      </div>
    </div>

    <!-- 复杂度:面试官一定会接这一句 -->
    <p
      v-if="block.complexity"
      class="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 rounded-md bg-muted/40 px-2.5 py-1.5 text-[12px] leading-5"
    >
      <span class="text-xs font-medium text-muted-foreground">
        复杂度
      </span>
      <RichText :text="block.complexity" />
    </p>

    <!-- 易错点 -->
    <ul v-if="block.traps?.length" class="mt-2 space-y-1">
      <li
        v-for="(t, i) in block.traps"
        :key="i"
        class="flex gap-1.5 text-[12px] leading-5 text-muted-foreground"
      >
        <TriangleAlertIcon class="mt-0.5 size-3 shrink-0 text-amber-500" />
        <span class="min-w-0"><RichText :text="t" /></span>
      </li>
    </ul>
  </section>
</template>
