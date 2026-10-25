<script setup lang="ts">
import { useRoute } from 'vue-router'
import { BookOpenIcon, CalculatorIcon, HomeIcon, LayersIcon, TimerIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'

const route = useRoute()

const items = [
  { icon: HomeIcon, label: '首页', to: { name: 'home' } },
  { icon: BookOpenIcon, label: '题库', to: { name: 'browse' } },
  { icon: LayersIcon, label: '背题', to: { name: 'flashcards' } },
  { icon: TimerIcon, label: '模考', to: { name: 'quiz' } },
  { icon: CalculatorIcon, label: '统计', to: { name: 'stats' } },
]
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur-lg md:hidden"
    style="padding-bottom: env(safe-area-inset-bottom)"
  >
    <div class="grid grid-cols-5">
      <RouterLink
        v-for="item in items"
        :key="item.label"
        :to="item.to"
        :class="cn(
          'flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors',
          route.name === item.to.name
            ? 'font-medium text-primary'
            : 'text-muted-foreground active:bg-accent/60',
        )"
      >
        <component :is="item.icon" class="size-5" />
        {{ item.label }}
      </RouterLink>
    </div>
  </nav>
</template>
