<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  options: { value: string; label: string; icon?: Component }[]
  modelValue: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <!-- iOS 分段控件观感:灰底凹槽 + 选中白底浮起,只用于移动端窄行 -->
  <div class="flex rounded-lg bg-muted p-0.5" role="tablist">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === option.value"
      class="pressable flex-1 rounded-md px-2 py-1.5 text-sm transition-colors"
      :class="
        modelValue === option.value
          ? 'bg-background font-medium text-foreground shadow-xs'
          : 'text-muted-foreground'
      "
      @click="emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" v-if="option.icon" class="mr-1 inline size-4 align-[-2px]" />
      {{ option.label }}
    </button>
  </div>
</template>
