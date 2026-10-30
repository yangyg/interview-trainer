<script setup lang="ts">
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'
import { MOBILE_NAV, isNavActive } from '@/lib/nav'

const route = useRoute()
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur-lg md:hidden"
    style="padding-bottom: env(safe-area-inset-bottom)"
  >
    <!-- 6 项在 320px 屏上每项约 53px:图标 20px + 两字标签,够用但不能再加 -->
    <div class="grid grid-cols-6">
      <RouterLink
        v-for="item in MOBILE_NAV"
        :key="item.key"
        :to="item.to"
        :class="
          cn(
            'flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors',
            isNavActive(route, item)
              ? 'font-medium text-primary'
              : 'text-muted-foreground active:bg-accent/60',
          )
        "
      >
        <component :is="item.icon" class="size-5" />
        {{ item.short }}
      </RouterLink>
    </div>
  </nav>
</template>
