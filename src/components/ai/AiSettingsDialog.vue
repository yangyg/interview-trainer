<script setup lang="ts">
import { ref, watch } from "vue";
import { Loader2Icon, PlugZapIcon } from "@lucide/vue";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_PRESETS, useAiStore, type AiProviderType } from "@/stores/ai";

const open = defineModel<boolean>("open", { default: false });
const store = useAiStore();

const form = ref({ ...store.config });
const testing = ref(false);
const testResult = ref<{ ok: boolean; message: string } | null>(null);

watch(open, (v) => {
  if (v) {
    form.value = { ...store.config };
    testResult.value = null;
  }
});

const currentPreset = () => AI_PRESETS.find((p) => p.id === form.value.providerId);

function applyPreset(id: string) {
  const p = AI_PRESETS.find((x) => x.id === id);
  if (!p) return;
  form.value.providerId = p.id;
  form.value.type = p.type;
  form.value.baseUrl = p.baseUrl;
  form.value.model = p.model;
  testResult.value = null;
}

function pickType(t: string) {
  form.value.type = t as AiProviderType;
  form.value.providerId = "custom";
}

async function saveAndTest() {
  if (!form.value.baseUrl.trim() || !form.value.model.trim()) {
    toast.error("请填写 baseUrl 与模型名");
    return;
  }
  form.value.baseUrl = form.value.baseUrl.trim();
  form.value.model = form.value.model.trim();
  store.config = { ...form.value };
  testing.value = true;
  testResult.value = null;
  testResult.value = await store.testConnection();
  testing.value = false;
  if (testResult.value.ok) {
    toast.success("配置已保存,连接测试通过");
  } else {
    toast.error("连接测试未通过,请检查配置");
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>AI 助手设置</DialogTitle>
        <DialogDescription>
          选择供应商预设后填入 API Key 即可;密钥仅保存在本机浏览器
          localStorage,不会上传。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label>供应商预设</Label>
          <Select
            :model-value="form.providerId"
            @update:model-value="applyPreset(String($event))"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择供应商" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup
                v-for="group in ['国内', '国际', '本地'] as const"
                :key="group"
              >
                <SelectLabel>{{ group }}</SelectLabel>
                <SelectItem
                  v-for="p in AI_PRESETS.filter((x) => x.group === group)"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.label }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>协议类型</Label>
            <Select
              :model-value="form.type"
              @update:model-value="pickType(String($event))"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI 兼容</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label>模型名</Label>
            <Input v-model="form.model" placeholder="如 deepseek-chat" list="ai-model-hints" />
            <datalist id="ai-model-hints">
              <option v-for="p in AI_PRESETS" :key="p.id" :value="p.model" />
            </datalist>
          </div>
        </div>

        <div class="space-y-1.5">
          <Label>API Key</Label>
          <Input
            v-model="form.apiKey"
            type="password"
            :placeholder="currentPreset()?.needsKey === false ? '本地服务无需 Key' : 'sk-…'"
            autocomplete="off"
          />
          <p v-if="currentPreset()?.note" class="text-xs leading-relaxed text-muted-foreground">
            {{ currentPreset()?.note }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label>Base URL</Label>
            <Input v-model="form.baseUrl" placeholder="https://api.deepseek.com/v1" />
          </div>
          <div class="space-y-1.5">
            <Label>温度(0~1)</Label>
            <Input v-model.number="form.temperature" type="number" min="0" max="1" step="0.1" />
          </div>
        </div>

        <p
          v-if="testResult"
          class="rounded-md border px-3 py-2 text-xs leading-relaxed"
          :class="
            testResult.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          "
        >
          {{ testResult.message }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="testing" @click="saveAndTest">
          <Loader2Icon v-if="testing" class="animate-spin" />
          <PlugZapIcon v-else />
          {{ testing ? "测试中…" : "保存并测试连接" }}
        </Button>
        <Button v-if="testResult?.ok" @click="open = false">完成</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
