<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon, FlameIcon, RotateCcwIcon, SkullIcon, TrophyIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import HpBar from '@/components/tower/HpBar.vue'
import QuizCard from '@/components/tower/QuizCard.vue'
import { LANG_META } from '@/lib/langs'
import { useTabBarHidden } from '@/composables/useTabBarHidden'
import { useDataStore } from '@/stores/data'
import { useTowerDataStore } from '@/stores/towerData'
import { useTowerStore } from '@/stores/tower'

const route = useRoute()
const router = useRouter()
const store = useTowerStore()
const towerData = useTowerDataStore()
const data = useDataStore()
const { setTabBarHidden } = useTabBarHidden()

const layerId = computed(() => String(route.params.layerId))
const booting = ref(true)
const outcome = ref<{ damage: number; healed: number; taken: number } | null>(null)

onMounted(async () => {
  try {
    await store.resumeRun()
    if (!store.run || store.run.layerId !== layerId.value) {
      await store.startRun(layerId.value)
    }
    await towerData.loadIndex()
  } catch (err) {
    store.error = err instanceof Error ? err.message : '这一层加载失败'
  } finally {
    // 无论恢复还是开局失败，都必须退出骨架屏，否则页面会永远停在「正在准备」
    booting.value = false
    setTabBarHidden(true)
  }
})

// 同一路由记录内换层不会重新挂载，必须手动换局，否则会顶着新层名继续旧层的题
watch(layerId, async (id) => {
  if (store.run?.layerId === id) return
  store.abandon()
  outcome.value = null
  booting.value = true
  await store.startRun(id)
  booting.value = false
})

onUnmounted(() => setTabBarHidden(false))

const room = computed(() => store.room)
const item = computed(() => store.currentItem)
const run = computed(() => store.run)
const layer = computed(() => towerData.topics.find((topic) => topic.id === layerId.value))

const feedback = computed(() => {
  const active = room.value
  const current = item.value
  if (!active || !current) return null
  const record = active.answers.find((answer) => answer.itemId === current.id)
  return record ? { ok: record.ok, picked: record.picked } : null
})

const isLastQuestion = computed(() => {
  const active = room.value
  return active ? active.index >= active.items.length - 1 : false
})

const roomFinished = computed(() => {
  const active = room.value
  return active ? active.phase === 'cleared' || active.phase === 'failed' : false
})

const finished = computed(() => store.status === 'won' || store.status === 'lost')

const summary = computed(() => {
  const state = run.value
  if (!state) return null
  return {
    answered: state.stats.answered,
    correct: state.stats.correct,
    accuracy: state.stats.answered ? state.stats.correct / state.stats.answered : 0,
    maxCombo: state.stats.maxCombo,
    hp: state.hp,
    maxHp: state.maxHp,
    seconds: state.endedAt ? Math.max(1, Math.round((state.endedAt - state.startedAt) / 1000)) : 0,
  }
})

const wrongQuestions = computed(() => {
  const state = run.value
  if (!state) return []
  return Object.entries(state.pendingGrades)
    .filter(([, entry]) => entry.wrong)
    .map(([srcId]) => ({ id: srcId, title: data.questionsById[srcId]?.title ?? srcId }))
})

function submit(picked: string[]) {
  const result = store.answer(picked)
  outcome.value = result ? { damage: result.damage, healed: result.healed, taken: result.taken } : null
}

function next() {
  outcome.value = null
  store.nextQuestion()
}

async function advance() {
  outcome.value = null
  await store.advance()
}

async function retry() {
  outcome.value = null
  await store.startRun(layerId.value)
}

function quit() {
  store.abandon()
  void router.push({ name: 'tower' })
}

onBeforeRouteLeave(() => {
  if (store.status === 'playing') store.abandon()
})
</script>

<template>
  <div class="mx-auto w-full max-w-3xl pb-6">
    <div v-if="booting" class="py-16 text-center text-sm text-muted-foreground">正在准备这一层…</div>

    <div v-else-if="store.error" class="rounded-xl border border-destructive/40 p-4 text-sm">
      {{ store.error }}
      <Button variant="outline" class="mt-3" @click="router.push({ name: 'tower' })">回到塔</Button>
    </div>

    <template v-else-if="finished">
      <!-- 整层结算 -->
      <div class="flex items-center justify-between">
        <Button variant="ghost" size="sm" @click="router.push({ name: 'tower' })">
          <ArrowLeftIcon /> 回到塔
        </Button>
      </div>

      <Card class="mt-4 p-6 text-center">
        <component
          :is="store.status === 'won' ? TrophyIcon : SkullIcon"
          class="mx-auto size-10"
          :class="store.status === 'won' ? 'status-mastered' : 'status-wrong'"
        />
        <h1 class="mt-3 text-xl font-semibold">
          {{ store.status === 'won' ? '这一层通过了' : '倒在了这一层' }}
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ layer?.name }} · {{ LANG_META[layer?.language ?? 'java'].label }}
        </p>

        <dl v-if="summary" class="mt-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
          <div class="rounded-xl border p-3">
            <dt class="text-xs text-muted-foreground">正确率</dt>
            <dd class="mt-1 font-mono text-lg tabular-nums">{{ Math.round(summary.accuracy * 100) }}%</dd>
          </div>
          <div class="rounded-xl border p-3">
            <dt class="text-xs text-muted-foreground">答对</dt>
            <dd class="mt-1 font-mono text-lg tabular-nums">{{ summary.correct }}/{{ summary.answered }}</dd>
          </div>
          <div class="rounded-xl border p-3">
            <dt class="text-xs text-muted-foreground">最高连击</dt>
            <dd class="mt-1 font-mono text-lg tabular-nums">{{ summary.maxCombo }}</dd>
          </div>
          <div class="rounded-xl border p-3">
            <dt class="text-xs text-muted-foreground">剩余状态</dt>
            <dd class="mt-1 font-mono text-lg tabular-nums">{{ summary.hp }}/{{ summary.maxHp }}</dd>
          </div>
        </dl>

        <div v-if="wrongQuestions.length" class="mt-5 rounded-xl border p-4 text-left">
          <p class="text-xs font-medium text-muted-foreground">这一层答错的题（已进复习队列）</p>
          <ul class="mt-2 space-y-1.5">
            <li v-for="question in wrongQuestions" :key="question.id" class="text-sm">
              <RouterLink
                :to="{ name: 'browse', query: { q: question.id } }"
                class="underline-offset-4 hover:underline"
              >
                {{ question.title }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button class="h-11" @click="retry">
            <RotateCcwIcon /> 再来一次
          </Button>
          <Button variant="outline" class="h-11" @click="router.push({ name: 'tower' })">换一层</Button>
        </div>
      </Card>
    </template>

    <template v-else-if="room">
      <!-- 战斗 HUD -->
      <div class="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" @click="quit">
          <ArrowLeftIcon /> 退出
        </Button>
        <span class="truncate text-sm font-medium">{{ layer?.name }}</span>
        <span class="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {{ Math.min(room.index + 1, room.items.length) }}/{{ room.items.length }}
        </span>
      </div>

      <div class="mt-3 space-y-3">
        <HpBar label="我的状态" :current="run?.hp ?? 0" :max="run?.maxHp ?? 60" />
        <HpBar
          :label="room.type === 'elite' ? '精英面试官' : '面试官'"
          :current="room.enemyHp"
          :max="room.enemyMaxHp"
          tone="enemy"
        />
      </div>

      <div v-if="room.combo >= 2" class="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <FlameIcon class="size-3.5" />
        连对 {{ room.combo }} 题
      </div>

      <!-- 房间结束 -->
      <Card v-if="roomFinished" class="mt-4 p-6 text-center">
        <p class="text-base font-semibold">
          {{ room.enemyHp <= 0 ? '击破了这一房' : '撤离了这一房' }}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">
          <template v-if="room.enemyHp > 0">
            还差 {{ room.enemyHp }} 点伤害，题已答完。答对 {{ room.answers.filter((a) => a.ok).length }}/{{ room.items.length }} 题。
          </template>
          <template v-else>
            答对 {{ room.answers.filter((a) => a.ok).length }}/{{ room.items.length }} 题，最高连击 {{ room.maxCombo }}。
          </template>
        </p>
        <Button class="mt-5 h-11 w-full sm:w-auto" @click="advance">
          {{ room.phase === 'failed' ? '查看结算' : '继续前进' }}
        </Button>
      </Card>

      <!-- 答题 -->
      <Card v-else class="mt-4 p-5">
        <QuizCard v-if="item" :item="item" :feedback="feedback" @submit="submit" />

        <div v-if="feedback" class="mt-4 flex items-center justify-between gap-3">
          <p class="text-xs text-muted-foreground">
            <template v-if="outcome && outcome.damage > 0">
              造成 {{ outcome.damage }} 点伤害<template v-if="outcome.healed">，回复 {{ outcome.healed }} 点状态</template>
            </template>
            <template v-else-if="outcome && outcome.taken > 0">受到 {{ outcome.taken }} 点伤害</template>
          </p>
          <Button class="h-11 shrink-0" :disabled="room.phase !== 'feedback'" @click="next">
            {{ isLastQuestion ? '结束本房' : '下一题' }}
          </Button>
        </div>
      </Card>
    </template>
  </div>
</template>
