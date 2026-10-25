import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/browse', name: 'browse', component: () => import('@/views/BrowseView.vue') },
    { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue') },
    { path: '/flashcards', name: 'flashcards', component: () => import('@/views/FlashcardView.vue') },
    { path: '/quiz', name: 'quiz', component: () => import('@/views/QuizView.vue') },
    { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
    { path: '/wrongbook', name: 'wrongbook', component: () => import('@/views/WrongBookView.vue') },
    { path: '/docs/:id', name: 'doc', component: () => import('@/views/DocView.vue') },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
