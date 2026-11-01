import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { registerSW } from 'virtual:pwa-register'
import './style.css'

// autoUpdate:检测到新版本后在本轮生命周期内静默预缓存,下次刷新生效
registerSW({ immediate: true })

createApp(App).use(createPinia()).use(router).mount('#app')
