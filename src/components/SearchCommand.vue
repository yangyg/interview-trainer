<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpenIcon, CalculatorIcon, HomeIcon, LayersIcon, NotebookIcon, SearchIcon, TimerIcon } from '@lucide/vue'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useDataStore } from '@/stores/data'
import { useEventListener } from '@vueuse/core'

const open = defineModel<boolean>('open', { default: false })
const query = ref('')

const router = useRouter()
const dataStore = useDataStore()

const results = computed(() => dataStore.searchQuestions(query.value, 20))

useEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value = !open.value
  }
})

const navActions = [
  { icon: HomeIcon, label: '首页', to: { name: 'home' } },
  { icon: BookOpenIcon, label: '题库浏览', to: { name: 'browse' } },
  { icon: LayersIcon, label: '背题卡片', to: { name: 'flashcards' } },
  { icon: TimerIcon, label: '模拟面试', to: { name: 'quiz' } },
  { icon: CalculatorIcon, label: '学习统计', to: { name: 'stats' } },
  { icon: NotebookIcon, label: '错题本', to: { name: 'wrongbook' } },
]

function goQuestion(questionId: string, topicId: string) {
  open.value = false
  query.value = ''
  router.push({ name: 'browse', query: { topic: topicId, q: questionId } })
}

function go(to: Parameters<typeof router.push>[0]) {
  open.value = false
  query.value = ''
  router.push(to)
}

/** 内部过滤改为简单包含匹配(minisearch 已负责真正的检索,内置 Intl 过滤对中文不友好) */
function simpleFilter(value: string, search: string): number {
  return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
}
</script>

<template>
  <CommandDialog
    v-model:open="open"
    title="搜索题目"
    description="按标题或答案内容检索,回车跳转"
    class="command-dialog"
    :filter-function="simpleFilter"
  >
    <CommandInput v-model="query" placeholder="搜索题目 / 关键词,如:HashMap、GMP、索引" />
    <CommandList class="max-h-[60vh]">
      <CommandGroup v-if="!query" heading="快捷导航">
        <CommandItem v-for="item in navActions" :key="item.label" :value="item.label" @select="go(item.to)">
          <component :is="item.icon" />
          {{ item.label }}
        </CommandItem>
      </CommandGroup>

      <template v-else>
        <CommandEmpty v-if="!results.length">没有匹配的题目</CommandEmpty>
        <CommandGroup v-else heading="题目">
          <CommandItem
            v-for="q in results"
            :key="q.id"
            :value="`${q.title} ${q.no}`"
            @select="goQuestion(q.id, q.topicId)"
          >
            <SearchIcon class="shrink-0 text-muted-foreground" />
            <span class="truncate">{{ q.title }}</span>
            <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ dataStore.topicName(q.topicId) }}</span>
          </CommandItem>
        </CommandGroup>
      </template>
      <CommandSeparator />
    </CommandList>
  </CommandDialog>
</template>
