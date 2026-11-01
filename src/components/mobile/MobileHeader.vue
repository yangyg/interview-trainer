<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon, SearchIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()

const title = computed(() => route.meta.title ?? '')
// level 2 是下钻页:左上角返回;tab 根页左侧留白保持标题居中
const showBack = computed(() => (route.meta.level ?? 1) >= 2)

function goBack() {
  // 通过直达链接落在下钻页(无历史)时退回首页,而不是把用户退出应用
  if (window.history.state?.back) router.back()
  else router.push({ name: 'home' })
}
</script>

<template>
  <header class="pt-safe sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
    <div class="relative flex h-12 items-center px-2">
      <div class="flex min-w-12 items-center justify-start">
        <Button
          v-if="showBack"
          variant="ghost"
          size="icon"
          class="pressable"
          aria-label="返回"
          @click="goBack"
        >
          <ArrowLeftIcon />
        </Button>
      </div>
      <h1
        class="pointer-events-none absolute left-1/2 top-1/2 max-w-[55%] -translate-x-1/2 -translate-y-1/2 truncate text-[17px] font-semibold tracking-tight"
      >
        {{ title }}
      </h1>
      <div class="ml-auto flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          class="pressable"
          aria-label="搜索"
          @click="router.push({ name: 'search' })"
        >
          <SearchIcon />
        </Button>
      </div>
    </div>
  </header>
</template>
