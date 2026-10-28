<script setup lang="ts">
import { ref } from 'vue'
import { MenuIcon, MoonIcon, SearchIcon, SunIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import AppSidebar from '@/components/AppSidebar.vue'
import BottomNav from '@/components/BottomNav.vue'
import SearchCommand from '@/components/SearchCommand.vue'
import { useTheme } from '@/composables/useTheme'
import { clearStorageIssue, storageIssue } from '@/lib/storage-health'
import { useCourseStore } from '@/stores/course'
import { useDataStore } from '@/stores/data'

const dataStore = useDataStore()
const courseStore = useCourseStore()
const { isDark, toggle } = useTheme()

dataStore.init()
// 课程索引与题库相互独立:课程还没加载完也能先渲染页面,
// 所以这里只发起请求,不把 courseStore 并进下面的 isReady 门控。
// isReady 只等题库正文;全文索引在首屏之后空闲构建,搜索面板自行显示构建状态。
courseStore.init()

const searchOpen = ref(false)
const mobileNavOpen = ref(false)
</script>

<template>
  <div class="min-h-svh bg-background">
    <!-- 桌面侧边栏 -->
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block">
      <AppSidebar />
    </aside>

    <div class="lg:pl-60">
      <header class="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-5">
        <!-- 移动端抽屉导航 -->
        <Sheet v-model:open="mobileNavOpen">
          <SheetTrigger as-child>
            <Button variant="ghost" size="icon" class="lg:hidden">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" class="w-64 p-0">
            <SheetHeader class="sr-only">
              <SheetTitle>导航</SheetTitle>
            </SheetHeader>
            <AppSidebar />
          </SheetContent>
        </Sheet>

        <button
          type="button"
          class="flex h-9 flex-1 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:max-w-md"
          @click="searchOpen = true"
        >
          <SearchIcon class="size-4" />
          <span>搜索题目…</span>
          <kbd class="ml-auto hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline-block">Ctrl K</kbd>
        </button>

        <Button variant="ghost" size="icon" :title="isDark ? '切换亮色' : '切换暗色'" @click="toggle">
          <SunIcon v-if="isDark" />
          <MoonIcon v-else />
        </Button>
      </header>

      <main class="mx-auto w-full max-w-6xl px-4 pb-20 py-6 sm:px-6 md:pb-6">
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

        <RouterView v-else v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <BottomNav />
    <SearchCommand v-model:open="searchOpen" />
    <Toaster position="top-center" :duration="2500" />
  </div>
</template>
