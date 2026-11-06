import { createRouter, createWebHashHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 移动端页头标题 */
    title?: string
    /** 移动端转场层级:1 = tab 根页(平级淡切),2 = 下钻页(方向性滑动),3 = 沉浸会话(战斗/结算) */
    level?: 1 | 2 | 3
    /** 桌面侧栏 / 移动底栏高亮归并 key */
    nav?: string
  }
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '首页', level: 1 } },
    { path: '/browse', name: 'browse', component: () => import('@/views/BrowseView.vue'), meta: { title: '题库', level: 1 } },
    { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue'), meta: { title: '搜索', level: 2 } },
    { path: '/flashcards', name: 'flashcards', component: () => import('@/views/FlashcardView.vue'), meta: { title: '背题', level: 1 } },
    { path: '/quiz', name: 'quiz', component: () => import('@/views/QuizView.vue'), meta: { title: '模拟面试', level: 2 } },
    { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue'), meta: { title: '学习统计', level: 2 } },
    { path: '/wrongbook', name: 'wrongbook', component: () => import('@/views/WrongBookView.vue'), meta: { title: '错题本', level: 2 } },
    { path: '/docs/:id', name: 'doc', component: () => import('@/views/DocView.vue'), meta: { title: '面经资料', level: 2 } },
    { path: '/more', name: 'more', component: () => import('@/views/MoreView.vue'), meta: { title: '我的', level: 1 } },
    // 爬塔：总览 -> 某一层（战斗与结算同页，靠 store 的 status 切换）
    {
      path: '/tower',
      name: 'tower',
      component: () => import('@/views/TowerView.vue'),
      meta: { nav: 'tower', title: '爬塔', level: 1 },
    },
    {
      path: '/tower/:layerId',
      name: 'tower-layer',
      component: () => import('@/views/TowerRoomView.vue'),
      meta: { nav: 'tower', title: '爬塔', level: 2 },
    },
    // 课程三个层级共用 meta.nav='courses',侧边栏与底栏才能在同一条导航项上高亮
    {
      path: '/courses',
      name: 'courses',
      component: () => import('@/views/CoursesView.vue'),
      meta: { nav: 'courses', title: '学习路径', level: 1 },
    },
    {
      path: '/courses/:courseId',
      name: 'course-detail',
      component: () => import('@/views/CourseDetailView.vue'),
      meta: { nav: 'courses', title: '课程详情', level: 2 },
    },
    {
      path: '/courses/:courseId/lessons/:lessonId',
      name: 'course-lesson',
      component: () => import('@/views/CourseLessonView.vue'),
      meta: { nav: 'courses', title: '课时学习', level: 2 },
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

/**
 * 空闲预取全部懒加载路由 chunk。
 * 所有视图都是 () => import() 懒加载,首次点击 tab 才开始下载该页 JS——
 * 手机蜂窝网络下题库(~170KB)要等近秒级、统计页(echarts,610KB)更久,且点击瞬间无任何反馈。
 * 首屏渲染完后在空闲期把 chunk 拉齐,后续导航就是纯本地切换。
 * 省流模式(navigator.connection.saveData)跳过。
 */
export function prefetchRouteChunks() {
  // 省流模式跳过(Network Information API,类型未进标准 lib)
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return
  for (const record of router.getRoutes()) {
    const component = record.components?.default
    if (typeof component === 'function') {
      void (component as () => Promise<unknown>)().catch(() => {})
    }
  }
}

export default router
