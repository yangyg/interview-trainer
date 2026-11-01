<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWindowScroll } from '@vueuse/core'
import { cn } from '@/lib/utils'
import { MOBILE_NAV, isNavActive } from '@/lib/nav'
import { useTabBarHidden } from '@/composables/useTabBarHidden'

const route = useRoute()
const { tabBarHidden } = useTabBarHidden()
const { y } = useWindowScroll()

// 下滚收起、上滚出现;小于 8px 的抖动与页顶 80px 内不触发,换页时复位
const scrolledAway = ref(false)
watch(y, (now, prev) => {
  if (Math.abs(now - prev) < 8) return
  scrolledAway.value = now > prev && now > 80
})
watch(
  () => route.fullPath,
  () => {
    scrolledAway.value = false
  },
)

const hidden = computed(() => tabBarHidden.value || scrolledAway.value)
</script>

<template>
  <nav
    aria-label="主导航"
    class="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/80 pb-safe backdrop-blur-xl transition-transform duration-300 ease-out"
    :class="hidden ? 'translate-y-full' : 'translate-y-0'"
  >
    <!-- 5 项在 320px 屏上每项 64px;更多入口走「我的」页,底栏不再扩容 -->
    <div class="mx-auto grid max-w-3xl grid-cols-5" :style="{ height: 'var(--tabbar-height)' }">
      <RouterLink
        v-for="item in MOBILE_NAV"
        :key="item.key"
        :to="item.to"
        :class="
          cn(
            'pressable flex flex-col items-center justify-center gap-0.5 transition-colors',
            isNavActive(route, item) ? 'text-primary' : 'text-muted-foreground',
          )
        "
      >
        <component
          :is="item.icon"
          class="size-[22px] transition-transform duration-200"
          :class="isNavActive(route, item) ? 'scale-105' : ''"
        />
        <span class="text-[10px] leading-none" :class="isNavActive(route, item) ? 'font-medium' : ''">
          {{ item.short }}
        </span>
      </RouterLink>
    </div>
  </nav>
</template>
