<script setup lang="ts">
/**
 * 本课覆盖的真题清单。
 *
 * 存在的理由:课时是把题库章节改写成讲义,一节课往往覆盖 8~16 道题,但正文里只会
 * 精讲 1 道(其余吸收成讲解)。读者因此没法判断「这课到底对应哪些题、我是不是都会了」。
 * 这张清单把「讲义 ↔ 题库」的对应关系显式化,并带上每道题的自评状态,可以当自查表用。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpRightIcon, ChevronDownIcon, ListChecksIcon } from '@lucide/vue'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'
import type { CardStatus } from '@/lib/types'

const props = defineProps<{
  ids: string[]
  /** 正文里有「真题拆解」区块的题,标出来,读者才知道哪几道被讲过 */
  focus?: string[]
}>()

const router = useRouter()
const dataStore = useDataStore()
const progress = useProgressStore()

const open = ref(false)

interface Item {
  id: string
  no: string
  title: string
  topicId: string
  language: string
  status?: CardStatus
  focus: boolean
}

const items = computed<Item[]>(() => {
  const out: Item[] = []
  for (const id of props.ids) {
    const q = dataStore.questionsById[id]
    if (!q) continue
    out.push({
      id,
      no: q.no,
      title: q.title,
      topicId: q.topicId,
      language: q.language,
      status: progress.recordOf(id)?.status,
      focus: (props.focus ?? []).includes(id),
    })
  }
  return out
})

const counts = computed(() => {
  const c = { mastered: 0, fuzzy: 0, wrong: 0, none: 0 }
  for (const it of items.value) c[it.status ?? 'none'] += 1
  return c
})

const DOT: Record<CardStatus | 'none', string> = {
  mastered: 'bg-emerald-500',
  fuzzy: 'bg-amber-500',
  wrong: 'bg-red-500',
  none: 'bg-muted-foreground/25',
}

function goTopic(it: Item) {
  router.push({ name: 'browse', query: { lang: it.language, topic: it.topicId, q: it.id } })
}
</script>

<template>
  <div v-if="items.length" class="mt-5 border-t border-border/60 pt-4">
    <button
      type="button"
      class="flex w-full items-start gap-2 text-left"
      :aria-expanded="open"
      @click="open = !open"
    >
      <ListChecksIcon class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <span class="min-w-0 flex-1">
        <span class="text-xs font-medium text-foreground">这课覆盖的 {{ items.length }} 道真题</span>
        <span class="ml-2 text-[11px] text-muted-foreground">
          <span v-if="counts.mastered">会 {{ counts.mastered }}</span>
          <span v-if="counts.fuzzy"> · 模糊 {{ counts.fuzzy }}</span>
          <span v-if="counts.wrong"> · 不会 {{ counts.wrong }}</span>
          <span v-if="counts.none"> · 未评 {{ counts.none }}</span>
        </span>
      </span>
      <ChevronDownIcon
        class="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <div v-if="open" class="mt-2.5 space-y-1">
      <button
        v-for="it in items"
        :key="it.id"
        type="button"
        class="group flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/60"
        @click="goTopic(it)"
      >
        <span class="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          {{ it.no }}
        </span>
        <span class="min-w-0 flex-1 text-[13px] leading-5 text-foreground/85">
          {{ it.title }}
          <span
            v-if="it.focus"
            class="ml-1.5 shrink-0 rounded border border-primary/30 bg-primary/[0.07] px-1 py-px align-middle text-[10px] text-primary"
          >
            正文精讲
          </span>
        </span>
        <span
          class="mt-1.5 size-1.5 shrink-0 rounded-full"
          :class="DOT[it.status ?? 'none']"
          :title="it.status === 'mastered' ? '会' : it.status === 'fuzzy' ? '模糊' : it.status === 'wrong' ? '不会' : '未评'"
        />
        <ArrowUpRightIcon
          class="size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
        />
      </button>
      <p class="pt-1 text-[11px] leading-5 text-muted-foreground">
        点任一题回题库看完整答案。带「正文精讲」的题在本课里有逐句拆解,其余是吸收进讲解的;
        圆点是自评状态,灰色表示还没评过。
      </p>
    </div>
  </div>
</template>
