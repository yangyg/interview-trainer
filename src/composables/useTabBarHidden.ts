import { ref } from 'vue'

/**
 * 移动底栏显隐的模块级单例。
 * QuizView / FlashcardView 在会话进行中调用 setTabBarHidden(true) 进入沉浸模式,
 * 必须在 onUnmounted(或会话结束)时还原为 false,否则底栏会在其它页面消失。
 */
const tabBarHidden = ref(false)

export function useTabBarHidden() {
  function setTabBarHidden(hidden: boolean) {
    tabBarHidden.value = hidden
  }
  return { tabBarHidden, setTabBarHidden }
}
