<script setup lang="ts">
defineProps<{
  /** 分组小标题,不传则不渲染 */
  title?: string
}>()
</script>

<template>
  <!-- 原生设置页分组列表:浅灰凹底 + 白色圆角单元格,分隔线内嵌 -->
  <section>
    <p v-if="title" class="px-1.5 pb-1.5 text-[13px] font-medium text-muted-foreground">{{ title }}</p>
    <div class="overflow-hidden rounded-2xl bg-muted/50">
      <div class="divide-y divide-border/50">
        <slot />
      </div>
    </div>
  </section>
</template>
