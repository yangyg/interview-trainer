<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  BookOpenIcon,
  CalculatorIcon,
  FileTextIcon,
  GraduationCapIcon,
  HomeIcon,
  LayersIcon,
  NotebookIcon,
  TimerIcon,
} from '@lucide/vue'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/stores/data'

const route = useRoute()
const dataStore = useDataStore()

const mainNav = [
  { icon: HomeIcon, label: '首页', to: { name: 'home' } },
  { icon: BookOpenIcon, label: '题库浏览', to: { name: 'browse' } },
  { icon: LayersIcon, label: '背题卡片', to: { name: 'flashcards' } },
  { icon: TimerIcon, label: '模拟面试', to: { name: 'quiz' } },
  { icon: CalculatorIcon, label: '学习统计', to: { name: 'stats' } },
  { icon: NotebookIcon, label: '错题本', to: { name: 'wrongbook' } },
]

const docNav = computed(() =>
  (dataStore.index?.docs ?? []).map((d) => ({
    label: d.title,
    to: { name: 'doc', params: { id: d.id } },
  })),
)

function isActive(to: { name: string; params?: { id?: string } }): boolean {
  if (route.name !== to.name) return false
  // 文档路由共用 name 'doc',需进一步比对 params.id 才能区分当前项
  if (to.params?.id !== undefined) return route.params.id === to.params.id
  return true
}
</script>

<template>
  <div class="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
    <div class="mb-4 flex items-center gap-2 px-2">
      <div class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCapIcon class="size-4.5" />
      </div>
      <div class="leading-tight">
        <p class="text-sm font-semibold">面试刷题工作台</p>
        <p class="text-[11px] text-muted-foreground">Java · Golang · AI 题库</p>
      </div>
    </div>

    <nav class="flex flex-col gap-0.5">
      <RouterLink
        v-for="item in mainNav"
        :key="item.label"
        :to="item.to"
        :class="cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          isActive(item.to) && 'bg-accent font-medium text-accent-foreground',
        )"
      >
        <component :is="item.icon" class="size-4" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="mt-5">
      <p class="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        面经与资料
      </p>
      <nav class="flex flex-col gap-0.5">
        <RouterLink
          v-for="item in docNav"
          :key="item.to.params.id as string"
          :to="item.to"
          :class="cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            isActive(item.to) && 'bg-accent font-medium text-accent-foreground',
          )"
        >
          <FileTextIcon class="size-4 shrink-0" />
          <span class="truncate">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <div class="mt-auto px-2.5 pt-4 text-[11px] leading-relaxed text-muted-foreground">
      题库共 {{ dataStore.total }} 题,来自本地文档解析
    </div>
  </div>
</template>
