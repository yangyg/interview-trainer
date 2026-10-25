import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Question } from '@/lib/types'
import { useDataStore } from '@/stores/data'
import { useProgressStore } from '@/stores/progress'

export type AiProviderType = 'openai' | 'anthropic' | 'gemini'
export type AiMode = 'interpret' | 'drill' | 'free'

export interface AiProviderPreset {
  id: string
  label: string
  group: '国内' | '国际' | '本地'
  type: AiProviderType
  baseUrl: string
  model: string
  needsKey: boolean
  note?: string
}

export interface AiConfig {
  providerId: string
  type: AiProviderType
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
  /** 触发该轮的交互模式(仅 user 消息携带) */
  mode?: AiMode
}

export const AI_PRESETS: AiProviderPreset[] = [
  { id: 'deepseek', label: 'DeepSeek', group: '国内', type: 'openai', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', needsKey: true },
  { id: 'moonshot', label: 'Kimi(月之暗面)', group: '国内', type: 'openai', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', needsKey: true },
  { id: 'qwen', label: '通义千问', group: '国内', type: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', needsKey: true },
  { id: 'zhipu', label: '智谱 GLM', group: '国内', type: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.5', needsKey: true },
  { id: 'openrouter', label: 'OpenRouter', group: '国际', type: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: '', needsKey: true, note: '聚合各家,模型名如 anthropic/claude-sonnet-4.5' },
  { id: 'anthropic', label: 'Anthropic Claude', group: '国际', type: 'anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-5', needsKey: true, note: '走官方浏览器直连请求头' },
  { id: 'gemini', label: 'Google Gemini', group: '国际', type: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash', needsKey: true },
  { id: 'ollama', label: 'Ollama(本地)', group: '本地', type: 'openai', baseUrl: 'http://localhost:11434/v1', model: '', needsKey: false, note: '免 Key;如遇跨域需设置环境变量 OLLAMA_ORIGINS=* 后重启' },
  { id: 'custom', label: '自定义', group: '本地', type: 'openai', baseUrl: '', model: '', needsKey: true },
]

function defaultConfig(): AiConfig {
  return {
    providerId: 'deepseek',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.7,
  }
}

const MAX_CHATS = 100
const MAX_HISTORY_SENT = 20

/** AI 输出为不可信外部内容,渲染前必须消毒 */
export function renderAiMarkdown(md: string): string {
  const html = marked.parse(md || '', { async: false, breaks: true }) as string
  return DOMPurify.sanitize(html)
}

export const useAiStore = defineStore('ai', () => {
  const config = useLocalStorage<AiConfig>('interview-trainer/ai-config-v1', defaultConfig(), { mergeDefaults: true })
  const chats = useLocalStorage<Record<string, AiMessage[]>>('interview-trainer/ai-chats-v1', {}, { mergeDefaults: true })

  const isConfigured = computed(() => {
    const preset = AI_PRESETS.find((p) => p.id === config.value.providerId)
    const keyOk = !!config.value.apiKey || !(preset?.needsKey ?? true)
    return !!config.value.baseUrl && !!config.value.model && keyOk
  })

  /** 生成中状态(questionId -> true),内存态:刷新后生成自然中断 */
  const generatingIds = ref<Record<string, true>>({})
  const controllers = new Map<string, AbortController>()

  function isGenerating(questionId: string): boolean {
    return !!generatingIds.value[questionId]
  }

  function messagesOf(questionId: string): AiMessage[] {
    return chats.value[questionId] ?? []
  }

  function pushMessage(questionId: string, msg: AiMessage) {
    chats.value = { ...chats.value, [questionId]: [...(chats.value[questionId] ?? []), msg] }
  }

  function updateLastAssistant(questionId: string, content: string) {
    const list = [...(chats.value[questionId] ?? [])]
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'assistant') {
        list[i] = { ...list[i], content }
        break
      }
    }
    chats.value = { ...chats.value, [questionId]: list }
  }

  function clearChat(questionId: string) {
    const next = { ...chats.value }
    delete next[questionId]
    chats.value = next
  }

  /** 容量控制:最多保留 MAX_CHATS 道题的会话,按最后一条消息时间清最旧 */
  function trimChats() {
    const entries = Object.entries(chats.value)
    if (entries.length <= MAX_CHATS) return
    entries.sort((a, b) => (b[1].at(-1)?.ts ?? 0) - (a[1].at(-1)?.ts ?? 0))
    chats.value = Object.fromEntries(entries.slice(0, MAX_CHATS))
  }

  // ---------- 提示词 ----------

  function systemPrompt(q: Question, mode: AiMode): string {
    const dataStore = useDataStore()
    const progressStore = useProgressStore()
    const statusMap: Record<string, string> = { mastered: '已掌握', fuzzy: '模糊', wrong: '不会' }
    const record = progressStore.recordOf(q.id)
    const statusLabel = record ? statusMap[record.status] ?? '未学习' : '未学习'
    const langLabel = q.language === 'ai' ? 'AI/大模型' : q.language === 'go' ? 'Golang' : 'Java'
    const base = [
      `你是一位资深的${langLabel}技术面试官与面试教练,正在与用户围绕一道面试题互动。`,
      ``,
      `【当前题目上下文】`,
      `- 题库:${dataStore.topicName(q.topicId)}`,
      `- 章节:${q.chapter}`,
      `- 题目:${q.no} ${q.title}`,
      `- 题库参考要点(标准答案,供你参考,不要原文照背):`,
      q.searchText.slice(0, 2000),
      `- 用户对该题的自评:${statusLabel}`,
      ``,
      `要求:中文回答;分点简洁、条理清晰;基于可靠的工程知识,不确定就明确说明;不要编造不存在的 API 或概念。`,
    ].join('\n')
    if (mode === 'interpret') {
      return (
        base +
        `\n\n用户点击了「AI 解读」。请用 markdown 输出:1) 原理展开(比参考要点更深一层,讲清为什么);2) 最容易答错的 2~3 个易错点;3) 面试官视角的加分答法(怎么组织、能主动提什么);4) 该题常见追问预告(2~4 个,只列问题)。`
      )
    }
    if (mode === 'drill') {
      return (
        base +
        `\n\n现在进入「追问演练」模式:你是面试官,基于该题对用户连续追问。规则:\n1) 你先抛出第一个追问,一次只问一个问题,不要给出答案;\n2) 用户作答后:先简短点评(对错、遗漏、改进点,给 1~10 分),再抛出下一个追问;\n3) 追问逐步加深:概念 → 原理 → 实战场景;\n4) 根据用户自评状态(${statusLabel})调节难度;用户答不上来时给提示而不是直接公布答案。\n现在请抛出第一个追问。`
      )
    }
    return base + `\n\n用户将针对该题自由提问,请结合题目上下文准确、简洁地回答。`
  }

  // ---------- 协议适配:三类型流式调用 ----------

  function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '')
  }

  function humanizeHttpError(status: number, body: string): string {
    if (status === 401 || status === 403) return `鉴权失败(${status}):请检查 API Key 是否正确、是否有该模型权限。${body}`
    if (status === 404) return `未找到接口(404):请检查 baseUrl 是否正确(通常以 /v1 结尾)、模型名是否可用。${body}`
    if (status === 429) return `触发限流(429):稍后重试或检查账户额度。${body}`
    return `请求失败(${status}):${body || '无响应体'}`
  }

  function humanizeFetchError(e: unknown): string {
    if (e instanceof DOMException && e.name === 'AbortError') return '已停止生成。'
    if (e instanceof DOMException && e.name === 'TimeoutError') return '请求超时:供应商无响应,请检查 baseUrl 可达性与网络(本地 Ollama 需设置 OLLAMA_ORIGINS=*)。'
    return `网络请求失败:请检查 baseUrl 可达性;本地 Ollama 需设置 OLLAMA_ORIGINS=* 解决跨域;公司网络可能拦截直连。(${(e as Error).message})`
  }

  async function streamChat(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    signal: AbortSignal,
    onDelta: (text: string) => void,
  ): Promise<string> {
    const cfg = config.value
    const base = normalizeBaseUrl(cfg.baseUrl)
    let res: Response
    if (cfg.type === 'anthropic') {
      const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
      const rest = messages.filter((m) => m.role !== 'system')
      res = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model: cfg.model, max_tokens: 4096, temperature: cfg.temperature, system, messages: rest, stream: true }),
      })
    } else if (cfg.type === 'gemini') {
      const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      res = await fetch(`${base}/v1beta/models/${encodeURIComponent(cfg.model)}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: cfg.temperature, maxOutputTokens: 4096 },
        }),
      })
    } else {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({ model: cfg.model, messages, stream: true, temperature: cfg.temperature }),
      })
    }

    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(humanizeHttpError(res.status, text))
    }
    if (!res.body) throw new Error('响应无内容流')

    let full = ''
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).trim()
        buf = buf.slice(idx + 1)
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload)
          if (cfg.type === 'anthropic') {
            if (json.type === 'content_block_delta' && json.delta?.text) {
              full += json.delta.text
              onDelta(json.delta.text)
            }
          } else if (cfg.type === 'gemini') {
            const parts = json.candidates?.[0]?.content?.parts ?? []
            for (const p of parts) {
              if (p.text) {
                full += p.text
                onDelta(p.text)
              }
            }
          } else {
            const delta = json.choices?.[0]?.delta?.content
            if (delta) {
              full += delta
              onDelta(delta)
            }
          }
        } catch {
          // 心跳/注释等非 JSON 行忽略
        }
      }
    }
    return full
  }

  // ---------- 对外动作 ----------

  async function testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      let out = ''
      await streamChat([{ role: 'user', content: '回复"OK"两个字' }], AbortSignal.timeout(20000), (d) => (out += d))
      if (!out.trim()) return { ok: false, message: '连接成功但未返回内容,请检查模型名。' }
      return { ok: true, message: `连接成功,模型响应:${out.trim().slice(0, 40)}` }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return { ok: false, message: '请求超时(20s)' }
      return { ok: false, message: e instanceof Error ? e.message : String(e) }
    }
  }

  async function ask(q: Question, mode: AiMode, userText?: string): Promise<void> {
    if (!isConfigured.value) throw new Error('请先在设置中配置模型供应商与 API Key')
    if (isGenerating(q.id)) return

    const userContent =
      mode === 'interpret'
        ? '请对该题做深入解读。'
        : mode === 'drill'
          ? !messagesOf(q.id).length
            ? '开始追问演练。'
            : (userText?.trim() || '请继续追问。')
          : (userText ?? '').trim()
    if (!userContent) return

    pushMessage(q.id, { role: 'user', content: userContent, ts: Date.now(), mode })
    pushMessage(q.id, { role: 'assistant', content: '', ts: Date.now() })

    const controller = new AbortController()
    controllers.set(q.id, controller)
    generatingIds.value = { ...generatingIds.value, [q.id]: true }

    try {
      const history = messagesOf(q.id)
        .slice(0, -1)
        .slice(-MAX_HISTORY_SENT)
        .map((m) => ({ role: m.role, content: m.content }))
      const payload: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt(q, mode) },
        ...history,
      ]
      let acc = ''
      await streamChat(
        payload,
        controller.signal,
        (delta) => {
          acc += delta
          updateLastAssistant(q.id, acc)
        },
      )
      if (!acc.trim()) updateLastAssistant(q.id, '(模型未返回内容,请检查模型名或稍后重试)')
    } catch (e) {
      const prev = messagesOf(q.id).filter((m) => m.role === 'assistant').at(-1)?.content ?? ''
      const msg = e instanceof DOMException && e.name === 'AbortError' ? '已停止生成。' : humanizeFetchError(e)
      updateLastAssistant(q.id, `${prev}\n\n> ⚠️ ${msg}`.trim())
    } finally {
      controllers.delete(q.id)
      const next = { ...generatingIds.value }
      delete next[q.id]
      generatingIds.value = next
      trimChats()
    }
  }

  function stop(questionId: string) {
    controllers.get(questionId)?.abort()
  }

  return {
    config,
    isConfigured,
    chats,
    messagesOf,
    clearChat,
    ask,
    stop,
    isGenerating,
    testConnection,
  }
})
