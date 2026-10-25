import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { computed, watchEffect } from 'vue'
import type { ThemeMode } from '@/lib/types'

const THEME_KEY = 'interview-trainer/theme'

export function useTheme() {
  const mode = useLocalStorage<ThemeMode>(THEME_KEY, 'system')
  const preferredDark = usePreferredDark()
  const isDark = computed(() => mode.value === 'dark' || (mode.value === 'system' && preferredDark.value))

  watchEffect(() => {
    document.documentElement.classList.toggle('dark', isDark.value)
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  })

  function setMode(m: ThemeMode) {
    mode.value = m
  }

  function toggle() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, setMode, toggle }
}
