<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BottomTabBar from './BottomTabBar.vue'
import MobileHeader from './MobileHeader.vue'
import DataGate from '@/components/DataGate.vue'

const route = useRoute()

// 方向性转场:level 升 = 下钻(slide-forward),降 = 返回(slide-back),平级 = tab 淡切。
// 必须在 watcher(pre-flush,先于渲染)里一次性算好存进 ref——
// 若用 computed,prevLevel 更新后重算就只剩平级一种结果了。
const prevLevel = ref(route.meta.level ?? 1)
const transitionName = ref<'slide-forward' | 'slide-back' | 'tab-fade'>('tab-fade')
watch(
  () => route.meta,
  (meta) => {
    const level = meta.level ?? 1
    transitionName.value =
      level > prevLevel.value ? 'slide-forward' : level < prevLevel.value ? 'slide-back' : 'tab-fade'
    prevLevel.value = level
  },
)
</script>

<template>
  <div class="flex min-h-svh flex-col bg-background">
    <MobileHeader />
    <main
      id="main-content"
      tabindex="-1"
      class="relative mx-auto w-full max-w-3xl px-safe pb-tabbar pt-3"
    >
      <DataGate>
        <RouterView v-slot="{ Component }">
          <Transition :name="transitionName">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </DataGate>
    </main>
    <BottomTabBar />
  </div>
</template>
