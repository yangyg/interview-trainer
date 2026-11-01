<script setup lang="ts">
import { computed } from 'vue'
import {
  CalculatorIcon,
  FileTextIcon,
  InfoIcon,
  NotebookIcon,
  TimerIcon,
} from '@lucide/vue'
import { CellItem, CellList, SegmentedTabs } from '@/components/mobile'
import { useTheme } from '@/composables/useTheme'
import type { ThemeMode } from '@/lib/types'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'

const dataStore = useDataStore()
const progress = useProgressStore()
const { mode, setMode } = useTheme()

const docNav = computed(() =>
  (dataStore.index?.docs ?? []).map((d) => ({
    label: d.title,
    to: { name: 'doc', params: { id: d.id } },
  })),
)

const wrongCount = computed(() => progress.wrongIds.length)

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '自动' },
]
</script>

<template>
  <div class="mx-auto flex w-full max-w-xl flex-col gap-5">
    <CellList title="练习">
      <CellItem :icon="TimerIcon" label="模拟面试" :to="{ name: 'quiz' }" />
      <CellItem
        :icon="NotebookIcon"
        label="错题本"
        :detail="wrongCount ? `${wrongCount} 题` : '暂无错题'"
        :to="{ name: 'wrongbook' }"
      />
      <CellItem :icon="CalculatorIcon" label="学习统计" :to="{ name: 'stats' }" />
    </CellList>

    <CellList v-if="docNav.length" title="面经与资料">
      <CellItem
        v-for="doc in docNav"
        :key="doc.to.params.id as string"
        :icon="FileTextIcon"
        :label="doc.label"
        :to="doc.to"
      />
    </CellList>

    <CellList title="外观">
      <div class="flex flex-col gap-2.5 bg-card px-3.5 py-3">
        <p class="text-[15px]">主题</p>
        <SegmentedTabs
          :options="themeOptions"
          :model-value="mode"
          @update:model-value="setMode($event as ThemeMode)"
        />
      </div>
    </CellList>

    <CellList title="数据">
      <CellItem
        :icon="InfoIcon"
        label="进度与备份"
        detail="导出 / 导入在统计页"
        :to="{ name: 'stats' }"
      />
      <div class="flex items-center gap-3 bg-card px-3.5 py-3 text-muted-foreground">
        <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          <InfoIcon class="size-4" />
        </span>
        <p class="text-[13px] leading-relaxed">
          进度、课程完成度与 AI 对话仅保存在本机浏览器 localStorage,题库共 {{ dataStore.total }} 题。
        </p>
      </div>
    </CellList>
  </div>
</template>
