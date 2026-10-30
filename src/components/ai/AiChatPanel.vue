<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  EraserIcon,
  MessagesSquareIcon,
  SendIcon,
  Settings2Icon,
  SparklesIcon,
  SquareIcon,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiSettingsDialog } from "@/components/ai";
import { renderAiMarkdown, useAiStore, type AiMode } from "@/stores/ai";
import type { Question } from "@/lib/types";

const props = defineProps<{ question: Question }>();

const store = useAiStore();
const settingsOpen = ref(false);
const input = ref("");
const listRef = ref<HTMLElement | null>(null);

const messages = computed(() => store.messagesOf(props.question.id));
const generating = computed(() => store.isGenerating(props.question.id));

/** 追问演练进行中:以最后一条带 mode 标记的 user 消息为准 */
const drillActive = computed(() => {
  const lastDrill = [...messages.value].reverse().find((m) => m.mode);
  return lastDrill?.mode === "drill";
});

async function run(mode: AiMode) {
  if (generating.value) return;
  const text = mode === "free" ? input.value : undefined;
  if (mode === "free" && !text?.trim()) return;
  input.value = "";
  try {
    await store.ask(props.question, mode, text);
  } catch (e) {
    // 未配置等错误已在面板引导处理;此处兜底提示
    console.warn(e);
  }
  await nextTick();
  scrollToBottom();
}

function scrollToBottom() {
  const el = listRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

watch(
  () => messages.value.map((m) => m.content.length).join(","),
  () => nextTick(() => scrollToBottom()),
);

function render(content: string) {
  return content ? renderAiMarkdown(content) : "";
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- 工具行 -->
    <div class="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
      <Button
        size="sm"
        variant="outline"
        :disabled="generating"
        title="生成该题深入解读"
        @click="run('interpret')"
      >
        <SparklesIcon />
        AI 解读
      </Button>
      <Button
        size="sm"
        :variant="drillActive ? 'secondary' : 'outline'"
        :disabled="generating"
        title="AI 扮演面试官,基于该题连续追问"
        @click="run('drill')"
      >
        <MessagesSquareIcon />
        追问演练
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="text-muted-foreground"
        title="清空本题对话"
        @click="store.clearChat(question.id)"
      >
        <EraserIcon />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="ml-auto text-muted-foreground"
        title="模型与密钥设置"
        @click="settingsOpen = true"
      >
        <Settings2Icon />
        设置
      </Button>
    </div>

    <!-- 未配置引导 -->
    <div v-if="!store.isConfigured" class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p class="text-sm font-medium">还没有配置模型</p>
      <p class="max-w-sm text-xs leading-relaxed text-muted-foreground">
        选择一个供应商预设(DeepSeek / Kimi / 通义 / Claude / Gemini / 本地
        Ollama…),填入 API Key 后即可使用 AI 解读与追问演练。密钥仅保存在本机浏览器。
      </p>
      <Button size="sm" @click="settingsOpen = true">
        <Settings2Icon />
        打开设置
      </Button>
    </div>

    <!-- 消息区 -->
    <template v-else>
      <div ref="listRef" class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <div
          v-for="(m, i) in messages"
          :key="i"
          :class="m.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
        >
          <div
            :class="
              m.role === 'user'
                ? 'max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap break-words'
                : 'md-body max-w-[92%] rounded-2xl rounded-bl-md border bg-card px-3.5 py-2.5 text-sm'
            "
          >
            <template v-if="m.role === 'assistant'">
              <!-- eslint-disable-next-line vue/no-v-html — 经 DOMPurify 消毒 -->
              <div v-if="m.content" v-html="render(m.content)"></div>
              <span
                v-else-if="generating"
                class="inline-block h-4 w-2 animate-pulse rounded-sm bg-foreground/60"
              />
            </template>
            <template v-else>{{ m.content }}</template>
          </div>
        </div>
        <p v-if="!messages.length" class="py-10 text-center text-xs leading-relaxed text-muted-foreground">
          「AI 解读」一键生成深入解读;「追问演练」由 AI 扮演面试官向你连续提问;
          也可以在下方直接输入任何问题。
        </p>
      </div>

      <!-- 输入区 -->
      <div class="flex items-center gap-2 border-t p-3">
        <Input
          v-model="input"
          aria-label="向 AI 提问"
          :placeholder="
            drillActive
              ? '输入你的回答…(Enter 发送)'
              : '针对本题提问,如:它和 X 的区别?(Enter 发送)'
          "
          class="flex-1"
          :disabled="generating"
          @keydown.enter.exact.prevent="run('free')"
        />
        <Button v-if="generating" variant="destructive" size="icon" title="停止生成" @click="store.stop(question.id)">
          <SquareIcon />
        </Button>
        <Button size="icon" :disabled="generating || !input.trim()" title="发送" @click="run('free')">
          <SendIcon />
        </Button>
      </div>
    </template>

    <AiSettingsDialog v-model:open="settingsOpen" />
  </div>
</template>
