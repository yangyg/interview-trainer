<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import AnswerBody from '@/components/AnswerBody.vue'
import QuestionMeta from '@/components/QuestionMeta.vue'
import StatusActions from '@/components/StatusActions.vue'
import type { Question } from '@/lib/types'

const props = defineProps<{
  question: Question
  /** 在当前筛选结果中的下标(0 起;-1 表示不在结果内,仅可直接直达) */
  index: number
  total: number
  topicName: string
  chapter: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'step', delta: number): void
  (e: 'ai'): void
}>()

// ---------- 卡堆拖拽编排 ----------
// 左滑 = 下一题,右滑 = 上一题;实时跟手,松手超过阈值(或快速轻扫)才 commit,否则弹回。
// 用 Pointer Events 自研而非 useSwipe:需要方向判定、代码块手势排除与实时 transform。
// touch-action: pan-y 必须同时声明在卡片与内部滚动容器上——
// Chrome 从触摸命中的滚动容器做手势仲裁,只挂在卡片上会被浏览器抢走水平手势(pointercancel)。
const HINT_KEY = 'interview-trainer/deck-hint'
const EXIT_MS = 180

const dragX = ref(0)
const dragging = ref(false)
const exitDir = ref<'left' | 'right' | null>(null)
const entering = ref(false)
const showHint = ref(!sessionStorage.getItem(HINT_KEY))

const bodyRef = ref<HTMLElement | null>(null)
let startX = 0
let startY = 0
let startT = 0

const canPrev = computed(() => props.index > 0)
const canNext = computed(() => props.index >= 0 && props.index < props.total - 1)

const cardStyle = computed(() => {
  if (exitDir.value) {
    return {
      transform: `translateX(${exitDir.value === 'left' ? -110 : 110}%) rotate(${exitDir.value === 'left' ? -8 : 8}deg)`,
      transition: 'transform 0.18s cubic-bezier(0.4, 0, 1, 1)',
    }
  }
  if (dragging.value) {
    const rot = Math.max(-9, Math.min(9, dragX.value * 0.03))
    return { transform: `translateX(${dragX.value}px) rotate(${rot}deg)`, transition: 'none' }
  }
  if (entering.value) {
    return { transform: 'scale(0.96) translateY(6px)', opacity: '0.6', transition: 'none' }
  }
  return { transform: 'translateX(0)', transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)' }
})

function onPointerDown(e: PointerEvent) {
  if (exitDir.value || entering.value) return
  // 代码块/表格自带横向滚动,把手势让给它
  if ((e.target as HTMLElement).closest('pre, table')) return
  dragging.value = true
  startX = e.clientX
  startY = e.clientY
  startT = performance.now()
  // 指针移出卡片也持续跟踪,松手在卡外同样生效
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  // 动态主导轴:水平占优才跟手;垂直占优交给原生滚动(浏览器接管时会 pointercancel 兜底弹回)。
  // 不做一次性锁死——真手指滑动常带弧线,先竖后横的轨迹不应被判死。
  if (Math.abs(dx) <= Math.abs(dy)) return
  dragX.value = dx
}

function settle(dir: 'left' | 'right' | null) {
  dragging.value = false
  dragX.value = 0
  if (!dir) return
  // 边界:第 1 题右滑 / 末页左滑,弹回即可
  if ((dir === 'left' && !canNext.value) || (dir === 'right' && !canPrev.value)) return
  exitDir.value = dir
  // 先飞出,再换题(否则飞行途中内容就变了)
  setTimeout(() => {
    exitDir.value = null
    emit('step', dir === 'left' ? 1 : -1)
  }, EXIT_MS)
  if (showHint.value) {
    showHint.value = false
    sessionStorage.setItem(HINT_KEY, '1')
  }
}

function onPointerUp() {
  if (!dragging.value) return
  const dx = dragX.value
  const velocity = Math.abs(dx) / Math.max(performance.now() - startT, 1)
  settle(
    dx <= -72 || (dx < -24 && velocity > 0.5)
      ? 'left'
      : dx >= 72 || (dx > 24 && velocity > 0.5)
        ? 'right'
        : null,
  )
}

function onPointerCancel() {
  // 浏览器接管滚动(垂直)时触发:弹回原位
  if (dragging.value) settle(null)
}

// 换题后(滑动 commit 或头部按钮):新卡从堆叠弹起 + 复位卡内滚动
watch(
  () => props.question.id,
  async () => {
    entering.value = true
    await nextTick()
    bodyRef.value?.scrollTo({ top: 0 })
    requestAnimationFrame(() => requestAnimationFrame(() => (entering.value = false)))
  },
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 头部 -->
    <div class="pt-safe">
      <div class="flex h-12 items-center gap-1 border-b border-border/60 px-2">
        <Button variant="ghost" size="icon" class="pressable" aria-label="返回列表" @click="emit('close')">
          <ArrowLeftIcon />
        </Button>
        <span class="min-w-0 flex-1 truncate text-center text-[13px] text-muted-foreground">
          {{ topicName }} · {{ chapter }}
        </span>
        <Button
          variant="ghost"
          size="icon"
          class="pressable"
          :disabled="!canPrev"
          aria-label="上一题"
          @click="emit('step', -1)"
        >
          <ChevronLeftIcon />
        </Button>
        <span class="min-w-10 text-center font-mono text-xs tabular-nums text-muted-foreground">
          {{ index + 1 }}/{{ total }}
        </span>
        <Button
          variant="ghost"
          size="icon"
          class="pressable"
          :disabled="!canNext"
          aria-label="下一题"
          @click="emit('step', 1)"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>

    <!-- 卡堆 -->
    <div class="relative min-h-0 flex-1 overflow-hidden bg-muted/40 px-3 pt-4">
      <!-- 装饰堆叠卡:宽度递减、底边逐层下探,从主卡下缘露出 -->
      <div
        class="absolute inset-x-7 top-4 bottom-0 rounded-2xl bg-card shadow-xs"
        aria-hidden="true"
      />
      <div
        class="absolute inset-x-5 top-2 bottom-1.5 rounded-2xl bg-card shadow-xs"
        aria-hidden="true"
      />

      <!-- 当前卡:实时跟手 -->
      <div
        class="absolute inset-x-3 top-0 bottom-3 flex touch-pan-y flex-col overflow-hidden rounded-2xl bg-card shadow-sm"
        :class="(dragging || exitDir) && 'select-none'"
        :style="cardStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @dragstart.prevent
      >
        <div ref="bodyRef" class="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-4">
          <div class="space-y-3">
            <p class="text-xs text-muted-foreground">
              {{ topicName }} · {{ chapter }} · {{ question.no }}
            </p>
            <h2 class="text-lg font-semibold leading-snug">{{ question.title }}</h2>
            <QuestionMeta :question="question" show-status />
          </div>
          <div class="mt-4">
            <AnswerBody :question="question" />
          </div>
        </div>
      </div>
    </div>

    <!-- 首次滑动提示 -->
    <p v-if="showHint" class="pb-1 pt-2 text-center text-xs text-muted-foreground">
      左滑下一题 · 右滑上一题
    </p>

    <!-- 底部操作条 -->
    <div class="border-t border-border/60 bg-background/90 px-safe py-2.5 pb-safe backdrop-blur-xl">
      <div class="flex items-center gap-2">
        <Button variant="outline" class="pressable flex-1" @click="emit('ai')">
          <SparklesIcon />
          AI 助手
        </Button>
        <StatusActions :question-id="question.id" compact />
      </div>
    </div>
  </div>
</template>
