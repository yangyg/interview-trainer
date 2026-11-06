<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRightIcon, TrophyIcon } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import { LANGUAGES, LANG_META } from '@/lib/langs'
import type { Language } from '@/lib/types'
import { useTowerDataStore } from '@/stores/towerData'
import { useTowerStore } from '@/stores/tower'

const data = useTowerDataStore()
const tower = useTowerStore()

onMounted(() => {
  void data.loadIndex()
})

const grouped = computed(() =>
  LANGUAGES.map((language) => ({
    language,
    topics: data.topics.filter((topic) => topic.language === language),
  })).filter((group) => group.topics.length > 0),
)

function clearedIn(language: Language): number {
  return data.topics.filter((topic) => topic.language === language && tower.meta.cleared[topic.id]).length
}

const totalCleared = computed(() => tower.clearedCount)
const totalTopics = computed(() => data.topics.length)

const lastRun = computed(() => tower.meta.lastRun)
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1">
      <h1 class="hidden text-2xl font-semibold tracking-tight lg:block">爬塔</h1>
      <p class="text-sm text-muted-foreground">
        一层一个专题。答对推进敌人血条、答错掉自己的血，血尽这层重来——已答错的题会自动进复习队列。
      </p>
    </header>

    <Card v-if="lastRun" class="border-dashed p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-medium">上次倒在了第 {{ lastRun.layerId }} 层</p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            剩余状态 {{ lastRun.hp }}，已通关 {{ totalCleared }}/{{ totalTopics }} 层
          </p>
        </div>
        <RouterLink
          :to="{ name: 'tower-layer', params: { layerId: lastRun.layerId } }"
          class="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          重新挑战
        </RouterLink>
      </div>
    </Card>

    <div v-if="data.loading" class="text-sm text-muted-foreground">正在加载关卡…</div>
    <div v-else-if="data.loadError" class="rounded-xl border border-destructive/40 p-4 text-sm">
      客观题库加载失败：{{ data.loadError }}
      <p class="mt-1 text-xs text-muted-foreground">请先运行 <code class="font-mono">npm run quiz</code> 生成题目。</p>
    </div>

    <section v-for="group in grouped" v-else :key="group.language" class="space-y-2">
      <div class="flex items-center gap-2">
        <span class="rounded px-1.5 py-0.5 text-xs font-medium text-white" :class="LANG_META[group.language].badge">
          {{ LANG_META[group.language].label }}
        </span>
        <span class="text-xs text-muted-foreground">
          {{ clearedIn(group.language) }}/{{ group.topics.length }} 层
        </span>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <RouterLink
          v-for="topic in group.topics"
          :key="topic.id"
          :to="{ name: 'tower-layer', params: { layerId: topic.id } }"
          class="pressable block"
        >
          <div
            class="flex min-h-16 items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:border-primary/40 lg:rounded-xl"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums"
              :class="tower.meta.cleared[topic.id] ? 'status-mastered' : 'text-muted-foreground'"
            >
              <TrophyIcon v-if="tower.meta.cleared[topic.id]" class="size-4" />
              <span v-else>{{ topic.items }}</span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium">{{ topic.name }}</span>
              <span class="mt-0.5 block text-xs text-muted-foreground">
                {{ topic.items }} 道客观题 · {{ topic.bosses }} 道口述储备
                <template v-if="tower.meta.cleared[topic.id]">
                  · 最佳 {{ Math.round(tower.meta.cleared[topic.id].best.accuracy * 100) }}%
                </template>
              </span>
            </span>
            <ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
