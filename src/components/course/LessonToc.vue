<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ items: { id: string; title: string }[] }>()

const active = ref(0)
let ticking = false

/** 高亮判定:视口顶部往下 140px 处「最后越过」的那一节就是当前节 */
function update() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    const mark = window.scrollY + 200
    let idx = 0
    for (let i = 0; i < props.items.length; i++) {
      const el = document.getElementById(props.items[i].id)
      if (!el) continue
      if (el.getBoundingClientRect().top + window.scrollY <= mark) idx = i
    }
    active.value = idx
  })
}

function go(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  active.value = props.items.findIndex((it) => it.id === id)
}

onMounted(() => {
  window.addEventListener('scroll', update, { passive: true })
  update()
})

onBeforeUnmount(() => window.removeEventListener('scroll', update))
</script>

<template>
  <nav v-if="items.length" class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
    <p class="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      本课目录
    </p>
    <ul class="space-y-0.5">
      <li v-for="(it, i) in items" :key="it.id">
        <button
          type="button"
          class="block w-full border-l-2 py-1 pl-2.5 text-left text-[11px] leading-4 transition-colors"
          :class="
            i === active
              ? 'border-primary font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          "
          @click="go(it.id)"
        >
          <span class="line-clamp-2">{{ it.title }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
