<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useDataStore } from '@/stores/data'
import type { Language } from '@/lib/types'

const route = useRoute()
const dataStore = useDataStore()

const html = ref('')
const loading = ref(false)
const error = ref('')

const docId = computed(() => String(route.params.id ?? ''))
const meta = computed(() => dataStore.index?.docs.find((d) => d.id === docId.value))
const language = computed<Language>(() => meta.value?.language ?? 'java')

async function load(id: string) {
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    const base = import.meta.env.BASE_URL
    const res = await fetch(`${base}data/docs/${id}.json`)
    if (!res.ok) throw new Error(`文档加载失败(${res.status})`)
    const data = await res.json()
    html.value = data.html ?? ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    html.value = ''
  } finally {
    loading.value = false
  }
}

watch(docId, (id) => load(id), { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-5">
      <p class="text-xs text-muted-foreground">
        面经与资料 · {{ language === 'go' ? 'Golang' : 'Java' }}
      </p>
      <h1 class="mt-1 text-xl font-semibold tracking-tight">{{ meta?.title ?? '文档' }}</h1>
      <p v-if="meta?.description" class="mt-0.5 text-sm text-muted-foreground">{{ meta.description }}</p>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton class="h-6 w-2/3" />
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-5/6" />
      <Skeleton class="h-40 w-full" />
    </div>

    <div v-else-if="error" class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
      {{ error }}
    </div>

    <!-- eslint-disable-next-line vue/no-v-html — 内容为构建时自产数据 -->
    <div v-else class="md-body md-doc rounded-xl border bg-card p-5 sm:p-7" v-html="html" />
  </div>
</template>
