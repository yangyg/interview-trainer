import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'

/**
 * 运行环境信号,模块级单例(与 useTheme 同理由所有调用方共享)。
 * - isMobile:lg(1024px) 以下走移动壳,与 App.vue 的 lg: 前缀同基准;
 * - coarsePointer:触屏设备,决定 hover 替代/手势开关;
 * - isStandalone:PWA standalone 运行(主屏图标启动),此时无浏览器 chrome。
 */
const isMobile = useMediaQuery('(max-width: 1023.98px)')
const coarsePointer = useMediaQuery('(pointer: coarse)')
const standaloneQuery = useMediaQuery('(display-mode: standalone)')
const isStandalone = computed(
  () => standaloneQuery.value || (navigator as { standalone?: boolean }).standalone === true,
)

export function usePlatform() {
  return { isMobile, coarsePointer, isStandalone }
}
