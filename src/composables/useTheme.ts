import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { computed, watchEffect } from 'vue'
import type { ThemeMode } from '@/lib/types'

const THEME_KEY = 'interview-trainer/theme'

/**
 * 模块级单例:所有调用方必须共享同一份状态。
 * 此前每次调用都在组件内新建一份 useLocalStorage——同一文档内的写入不会触发
 * storage 事件,于是 App.vue 切换主题后,统计页的图表配色不会跟随,直到刷新。
 */
const mode = useLocalStorage<ThemeMode>(THEME_KEY, 'system', { listenToStorageChanges: true })
const preferredDark = usePreferredDark()
const isDark = computed(() => mode.value === 'dark' || (mode.value === 'system' && preferredDark.value))

watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
  document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
})

export function useTheme() {
  function setMode(m: ThemeMode) {
    mode.value = m
  }

  function toggle() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, setMode, toggle }
}
