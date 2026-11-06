/**
 * 客观小题池的加载。
 * 按专题分片，进入某一层时才拉那一层的数据（1600 项全量约 1.9MB，不能首屏拉）。
 */

import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { QuizIndex, QuizPool } from '@/lib/quizgen/types'

export const useTowerDataStore = defineStore('towerData', () => {
  const index = shallowRef<QuizIndex | null>(null)
  const pools = shallowRef(new Map<string, QuizPool>())
  const loading = ref(false)
  const loadError = ref('')

  const topics = computed(() => index.value?.topics ?? [])

  async function loadIndex(): Promise<QuizIndex | null> {
    if (index.value) return index.value
    loading.value = true
    loadError.value = ''
    try {
      const base = import.meta.env.BASE_URL
      const res = await fetch(`${base}data/quiz/index.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      index.value = (await res.json()) as QuizIndex
      return index.value
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '加载失败'
      return null
    } finally {
      loading.value = false
    }
  }

  async function loadPool(topicId: string): Promise<QuizPool> {
    const cached = pools.value.get(topicId)
    if (cached) return cached
    const base = import.meta.env.BASE_URL
    const res = await fetch(`${base}data/quiz/${topicId}.json`)
    if (!res.ok) throw new Error(`题库加载失败：${topicId}（HTTP ${res.status}）`)
    const pool = (await res.json()) as QuizPool
    const next = new Map(pools.value)
    next.set(topicId, pool)
    pools.value = next
    return pool
  }

  function poolOf(topicId: string): QuizPool | undefined {
    return pools.value.get(topicId)
  }

  return { index, topics, loading, loadError, loadIndex, loadPool, poolOf }
})
