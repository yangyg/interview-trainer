<script setup lang="ts">
import { computed, ref } from 'vue'
import { ListIcon, NetworkIcon } from '@lucide/vue'
import DiagramPlayer from './DiagramPlayer.vue'
import StageAssemble from './StageAssemble.vue'
import { buildPrincipleTimeline } from '@/lib/timeline'
import { hasStageVisuals } from '@/lib/stageAssemble'
import type { LessonBlock } from '@/lib/types'

/**
 * principle 区块的两种演示：
 * - 分步讲解：线性事件流 + 单一游标（原有能力，所有课时都有）
 * - 分解连接：N 张独立阶段卡逐段连成链（steps 全带 visual 时自动多出来）
 *
 * 没有 visual 的老课时完全不渲染切换条，行为与以前逐字一致。
 */
const props = withDefaults(
  defineProps<{
    block: Extract<LessonBlock, { kind: 'principle' }>
    textMode?: 'visual' | 'text'
  }>(),
  { textMode: 'visual' },
)

const hasVisual = computed(() => hasStageVisuals(props.block.steps))
const timeline = computed(() => buildPrincipleTimeline(props.block))
/** 样板课默认给新演示；它的拆解态是静态的，不会自动播放、不吵闹 */
const view = ref<'assemble' | 'steps'>(hasVisual.value ? 'assemble' : 'steps')
</script>

<template>
  <div class="space-y-2">
    <div v-if="hasVisual" class="flex flex-wrap items-center gap-1" role="group" aria-label="演示方式">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
        :class="view === 'assemble' ? 'border-primary/35 bg-primary/[0.08] text-primary' : 'border-border/70 text-muted-foreground hover:text-foreground'"
        :aria-pressed="view === 'assemble'"
        @click="view = 'assemble'"
      >
        <NetworkIcon class="size-3" />分解连接
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
        :class="view === 'steps' ? 'border-primary/35 bg-primary/[0.08] text-primary' : 'border-border/70 text-muted-foreground hover:text-foreground'"
        :aria-pressed="view === 'steps'"
        @click="view = 'steps'"
      >
        <ListIcon class="size-3" />分步讲解
      </button>
      <span class="ml-auto hidden text-[10px] leading-5 text-muted-foreground sm:block">
        同一条链路，两种看的角度
      </span>
    </div>

    <StageAssemble
      v-if="hasVisual && view === 'assemble'"
      :steps="block.steps"
      :text-mode="textMode"
    />
    <DiagramPlayer v-else :timeline="timeline" variant="timeline" />
  </div>
</template>
