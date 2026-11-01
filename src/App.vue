<script setup lang="ts">
import { ref } from 'vue'
import { MoonIcon, SearchIcon, SunIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import AppSidebar from '@/components/AppSidebar.vue'
import DataGate from '@/components/DataGate.vue'
import MobileShell from '@/components/mobile/MobileShell.vue'
import SearchCommand from '@/components/SearchCommand.vue'
import { useTheme } from '@/composables/useTheme'
import { usePlatform } from '@/composables/usePlatform'
import { useCourseStore } from '@/stores/course'
import { useDataStore } from '@/stores/data'

const dataStore = useDataStore()
const courseStore = useCourseStore()
const { isDark, toggle } = useTheme()
const { isMobile } = usePlatform()

dataStore.init()
// 课程索引与题库相互独立:课程还没加载完也能先渲染页面,
// 所以这里只发起请求,不把 courseStore 并进下面的 isReady 门控。
// isReady 只等题库正文;全文索引在首屏之后空闲构建,搜索面板自行显示构建状态。
courseStore.init()

const searchOpen = ref(false)
const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
</script>

<template>
  <div class="min-h-svh bg-background">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
    >跳到正文</a>

    <!-- 移动壳(<lg):页头 + 底栏 tab + 方向性转场,见 components/mobile/ -->
    <MobileShell v-if="isMobile" />

    <!-- 桌面壳(lg+):侧边栏 + 顶栏,结构保持原样 -->
    <template v-else>
      <aside class="fixed inset-y-0 left-0 z-30 w-60 border-r bg-sidebar">
        <AppSidebar />
      </aside>

      <div class="pl-60">
        <header class="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-5 backdrop-blur">
          <button
            type="button"
            class="flex h-9 flex-1 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:max-w-md"
            @click="searchOpen = true"
          >
            <SearchIcon class="size-4" />
            <span>搜索题目…</span>
            <kbd class="ml-auto hidden rounded border bg-background px-1.5 font-mono text-[11px] sm:inline-block">{{ isMac ? '⌘ K' : 'Ctrl K' }}</kbd>
          </button>

          <Button variant="ghost" size="icon" :title="isDark ? '切换亮色' : '切换暗色'" @click="toggle">
            <SunIcon v-if="isDark" />
            <MoonIcon v-else />
          </Button>
        </header>

        <main id="main-content" tabindex="-1" class="mx-auto w-full max-w-6xl px-6 pb-6 py-6">
          <DataGate>
            <RouterView v-slot="{ Component }">
              <Transition name="page" mode="out-in">
                <component :is="Component" />
              </Transition>
            </RouterView>
          </DataGate>
        </main>
      </div>
    </template>

    <SearchCommand v-model:open="searchOpen" />
    <Toaster position="top-center" :duration="2500" />
  </div>
</template>
