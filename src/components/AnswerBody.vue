<script setup lang="ts">
import { ExternalLinkIcon } from '@lucide/vue'
import { Separator } from '@/components/ui/separator'
import type { Question } from '@/lib/types'

const props = defineProps<{ question: Question }>()
</script>

<template>
  <div>
    <!-- eslint-disable-next-line vue/no-v-html — 内容为构建时自产数据,无用户输入 -->
    <div class="md-body" v-html="props.question.answerHtml" />

    <template v-if="props.question.sources.length">
      <Separator class="my-4" />
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1 font-medium">
          <ExternalLinkIcon class="size-3.5" />
          来源
        </span>
        <a
          v-for="(s, i) in props.question.sources"
          :key="i"
          :href="s.url"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground hover:underline underline-offset-4 max-w-[280px] sm:max-w-[420px] truncate inline-block"
          :title="s.title ?? s.url"
        >
          {{ s.title ?? s.url }}
        </a>
      </div>
    </template>
  </div>
</template>
