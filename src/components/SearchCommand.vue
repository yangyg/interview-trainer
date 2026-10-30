<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SearchIcon } from '@lucide/vue'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { MAIN_NAV } from '@/lib/nav'
import { LANG_META } from '@/lib/langs'
import { useCourseStore } from '@/stores/course'
import { useDataStore } from '@/stores/data'
import { useDebounce, useEventListener } from '@vueuse/core'

const open = defineModel<boolean>('open', { default: false })
const query = ref('')
/** 与搜索页一致:逐键检索会放大索引查询与列表渲染开销 */
const debouncedQuery = useDebounce(query, 150)

const router = useRouter()
const dataStore = useDataStore()
const courseStore = useCourseStore()

const results = computed(() => dataStore.searchQuestions(debouncedQuery.value, 20))

/** 课程名过滤是内存字符串匹配,不必跟随检索防抖 */
const courseHits = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return courseStore.courses.slice(0, 6)
  return courseStore.courses
    .filter((c) => `${c.title} ${c.subtitle}`.toLowerCase().includes(q))
    .slice(0, 6)
})

/** 输入已追上防抖值,此时「空结果」才是真的空 */
const settled = computed(() => debouncedQuery.value === query.value)

useEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value = !open.value
  }
})

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

/** 结果已由 minisearch 与课程名过滤产出,关闭 cmdk 的二次过滤,避免防抖窗口内误判为空 */
function keepAll(): number {
  return 1
}
</script>

<template>
  <CommandDialog
    v-model:open="open"
    title="搜索题目"
    description="按标题或答案内容检索,回车跳转"
    class="command-dialog"
    :filter-function="keepAll"
  >
    <CommandInput v-model="query" aria-label="搜索题目或关键词" placeholder="搜索题目 / 关键词,如:HashMap、GMP、索引" />
    <CommandList class="max-h-[60vh]">
      <CommandGroup v-if="!query" heading="快捷导航">
        <CommandItem v-for="item in MAIN_NAV" :key="item.key" :value="item.label" @select="go(item.to)">
          <component :is="item.icon" />
          {{ item.label }}
        </CommandItem>
      </CommandGroup>

      <CommandGroup v-if="courseHits.length" :heading="query ? '相关课程' : '课程'">
        <CommandItem
          v-for="c in courseHits"
          :key="c.id"
          :value="`${c.title} ${c.subtitle}`"
          @select="go({ name: 'course-detail', params: { courseId: c.id } })"
        >
          <span class="size-2 shrink-0 rounded-full" :class="LANG_META[c.language].bar" />
          <span class="truncate">{{ c.title }}</span>
          <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ c.lessonCount }} 课时</span>
        </CommandItem>
      </CommandGroup>

      <template v-if="query">
        <CommandEmpty v-if="!dataStore.searchReady && !dataStore.searchError">正在建立搜索索引…</CommandEmpty>
        <CommandEmpty v-else-if="dataStore.searchError">搜索索引构建失败:{{ dataStore.searchError }}</CommandEmpty>
        <CommandEmpty v-else-if="settled && !results.length && !courseHits.length">没有匹配的题目</CommandEmpty>
        <CommandGroup v-else-if="results.length" heading="题目">
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
