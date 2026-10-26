import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { GradeResult } from '@/lib/types'

/**
 * 「逐题自评」的最小状态机,课时练习与阶段验收共用。
 *
 * 注意这里不写学习进度:评分由 StatusActions 调 progress.grade 完成(唯一写入点),
 * 本 composable 只记录「本轮点了什么」,用于展示与完成判定。
 */
export function useQuestionSession(ids: MaybeRefOrGetter<string[]>) {
  const index = ref(0)
  const revealed = ref(false)
  /** 本轮自评结果(只用于计数与小结,不是 SRS 真源) */
  const results = ref<Record<string, GradeResult>>({})

  const list = computed(() => toValue(ids))
  const total = computed(() => list.value.length)
  const currentId = computed<string | undefined>(() => list.value[index.value])
  const finished = computed(() => total.value > 0 && index.value >= total.value)
  const pct = computed(() =>
    total.value ? Math.round((Math.min(index.value, total.value) / total.value) * 100) : 0,
  )
  const reviewedCount = computed(() => Object.keys(results.value).length)

  const counts = computed(() => {
    const out: Record<GradeResult, number> = { mastered: 0, fuzzy: 0, wrong: 0 }
    for (const r of Object.values(results.value)) out[r] += 1
    return out
  })

  function reset() {
    index.value = 0
    revealed.value = false
    results.value = {}
  }

  function reveal() {
    revealed.value = true
  }

  function record(id: string, result: GradeResult) {
    results.value = { ...results.value, [id]: result }
  }

  function next() {
    if (index.value < total.value) index.value += 1
    revealed.value = false
  }

  /** 回看上一题时直接展开答案(已经看过,不必再点一次) */
  function prev() {
    if (index.value > 0) {
      index.value -= 1
      revealed.value = true
    }
  }

  function goTo(i: number) {
    index.value = Math.min(Math.max(i, 0), Math.max(total.value - 1, 0))
    revealed.value = false
  }

  // 题目集合变化(切换课时)时归零,避免残留 index 指向不存在的题
  watch(total, (n, old) => {
    if (n !== old) reset()
  })

  return {
    list,
    index,
    total,
    currentId,
    revealed,
    results,
    counts,
    finished,
    pct,
    reviewedCount,
    reset,
    reveal,
    record,
    next,
    prev,
    goTo,
  }
}
