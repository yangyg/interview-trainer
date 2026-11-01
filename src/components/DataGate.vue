<script setup lang="ts">
// 桌面壳与移动壳共用的数据门控:存储告警 / 加载失败 / 骨架屏,就绪后渲染 slot。
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { clearStorageIssue, storageIssue } from '@/lib/storage-health'
import { useDataStore } from '@/stores/data'

const dataStore = useDataStore()
</script>

<template>
  <div
    v-if="storageIssue"
    role="alert"
    class="mb-4 flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm sm:flex-row sm:items-start"
  >
    <div class="flex-1">
      <p class="font-medium">本地存储写入失败:{{ storageIssue.scope }}</p>
      <p class="mt-1 text-xs text-muted-foreground">
        新产生的内容可能没有保存。建议先到
        <RouterLink :to="{ name: 'stats' }" class="underline underline-offset-4">统计页</RouterLink>
        导出备份,并清理部分 AI 对话。
      </p>
      <p class="mt-1 text-xs text-muted-foreground">{{ storageIssue.message }}</p>
    </div>
    <Button variant="outline" size="sm" @click="clearStorageIssue">知道了</Button>
  </div>

  <div v-if="dataStore.loadError" class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
    题库数据加载失败:{{ dataStore.loadError }}
    <p class="mt-1 text-xs text-muted-foreground">
      请确认已运行 <code class="rounded bg-muted px-1">npm run parse</code> 生成数据,并通过 npm run dev / preview 访问。
    </p>
  </div>

  <div v-else-if="!dataStore.isReady" class="space-y-4">
    <Skeleton class="h-8 w-48" />
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton v-for="i in 4" :key="i" class="h-24" />
    </div>
    <Skeleton class="h-64" />
  </div>

  <slot v-else />
</template>
