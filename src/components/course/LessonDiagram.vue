<script setup lang="ts">
import { computed } from 'vue'
import RichText from '@/components/course/RichText.vue'
import DiagramPlayer from './diagram/DiagramPlayer.vue'
import DiagramStatic from './diagram/DiagramStatic.vue'
import {
  adaptSequenceTimeline,
  isPlayable,
  toProcessTimeline,
  type ProcessTimeline,
} from '@/lib/timeline'
import type { DiagramSpec } from '@/lib/types'

/**
 * 图示分发壳：有时间序的内容走统一播放器，其余保持静态快照。
 * 判断只看既有字段，作者源无需为新能力补任何数据。
 */
const props = defineProps<{ diagram: DiagramSpec }>()
const emit = defineEmits<{ complete: [] }>()

const caption = computed(() => ('caption' in props.diagram ? props.diagram.caption : undefined))

/** sequence 恒走播放器：不足 2 条消息时也用全量列表静读，不退回空白 */
const timeline = computed<ProcessTimeline | null>(() =>
  props.diagram.type === 'sequence'
    ? adaptSequenceTimeline(props.diagram)
    : toProcessTimeline(props.diagram),
)
const usePlayer = computed(
  () => !!timeline.value && (props.diagram.type === 'sequence' || isPlayable(timeline.value)),
)
const variant = computed<'sequence' | 'timeline'>(() =>
  timeline.value?.kind === 'sequence' ? 'sequence' : 'timeline',
)
</script>

<template>
  <figure class="not-prose">
    <DiagramPlayer
      v-if="usePlayer && timeline"
      :timeline="timeline"
      :variant="variant"
      @complete="emit('complete')"
    />
    <DiagramStatic v-else :diagram="diagram" />
    <figcaption v-if="caption" class="mt-2 text-center text-xs leading-snug text-muted-foreground">
      <RichText :text="caption" />
    </figcaption>
  </figure>
</template>
