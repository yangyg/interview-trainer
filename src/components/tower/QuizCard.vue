<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CheckIcon, XIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { QuizItem } from '@/lib/quizgen/types'

const props = defineProps<{
  item: QuizItem
  /** 已有的作答结果（反馈态）；null 表示还没作答 */
  feedback?: { ok: boolean; picked: string[] } | null
}>()

const emit = defineEmits<{ submit: [picked: string[]] }>()

const selected = ref<string[]>([])

// 换题时清空勾选，避免上一题的选择残留到下一题
watch(
  () => props.item.id,
  () => {
    selected.value = []
  },
)

const answered = computed(() => Boolean(props.feedback))
const isMultiChoice = computed(() => props.item.type === 'T2')

function isCorrectKey(key: string): boolean {
  const item = props.item
  if (item.type === 'T1' || item.type === 'T4') return item.answerKey === key
  if (item.type === 'T2') return item.answerKeys.includes(key)
  return false
}

function stateOf(key: string): 'correct' | 'wrong' | 'picked' | 'idle' {
  if (!props.feedback) return selected.value.includes(key) ? 'picked' : 'idle'
  if (isCorrectKey(key)) return 'correct'
  if (props.feedback.picked.includes(key)) return 'wrong'
  return 'idle'
}

function optionClass(key: string): string {
  const state = stateOf(key)
  if (state === 'correct') return 'status-mastered'
  if (state === 'wrong') return 'status-wrong'
  if (state === 'picked') return 'border-primary/60 bg-accent/60'
  return 'border-border hover:border-primary/40'
}

function toggle(key: string) {
  if (answered.value) return
  if (!isMultiChoice.value) {
    emit('submit', [key])
    return
  }
  selected.value = selected.value.includes(key)
    ? selected.value.filter((item) => item !== key)
    : [...selected.value, key]
}

function confirmMulti() {
  if (!selected.value.length) return
  emit('submit', [...selected.value])
}
</script>

<template>
  <div>
    <!-- 题干由构建期生成，只含 p / code / strong / span.blank -->
    <div class="md-body text-sm" v-html="item.stemHtml" />

    <div class="mt-4 grid gap-2" :aria-busy="answered ? 'false' : 'true'">
      <button
        v-for="option in item.options"
        :key="option.key"
        type="button"
        class="pressable flex min-h-12 w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors motion-reduce:transition-none disabled:cursor-default"
        :class="optionClass(option.key)"
        :disabled="answered"
        :aria-pressed="isMultiChoice ? selected.includes(option.key) : undefined"
        @click="toggle(option.key)"
      >
        <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-current/30 font-mono text-xs">
          {{ option.key }}
        </span>
        <span
          class="min-w-0 flex-1 leading-relaxed [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] dark:[&_code]:bg-white/10"
          v-html="option.html"
        />
        <CheckIcon v-if="stateOf(option.key) === 'correct'" class="mt-0.5 size-4 shrink-0" />
        <XIcon v-else-if="stateOf(option.key) === 'wrong'" class="mt-0.5 size-4 shrink-0" />
      </button>
    </div>

    <Button
      v-if="isMultiChoice && !answered"
      class="mt-3 h-11 w-full"
      :disabled="!selected.length"
      @click="confirmMulti"
    >
      确认选择{{ selected.length ? `（已选 ${selected.length}）` : '' }}
    </Button>

    <div v-if="answered" class="mt-4 rounded-xl border bg-muted/30 p-4">
      <span
        class="inline-block rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="feedback?.ok ? 'status-mastered' : 'status-wrong'"
      >
        {{ feedback?.ok ? '答对了' : '答错了' }}
      </span>
      <div class="md-body mt-2 text-sm" v-html="item.explainHtml" />
    </div>
  </div>
</template>
