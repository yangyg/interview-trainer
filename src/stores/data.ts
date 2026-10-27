import MiniSearch from 'minisearch'
import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { LANGUAGES } from '@/lib/langs'
import type { IndexData, Language, Question, Topic, TopicData } from '@/lib/types'

/** CJK 按二元组分词,拉丁词整词小写——让中文可前缀/模糊检索 */
function cjkTokenizer(text: string): string[] {
  const tokens: string[] = []
  for (const m of text.matchAll(/[a-zA-Z0-9]+|[\u3400-\u9fff]+/g)) {
    const seg = m[0]
    if (/^[a-zA-Z0-9]+$/.test(seg)) {
      tokens.push(seg.toLowerCase())
      continue
    }
    if (seg.length === 1) {
      tokens.push(seg)
      continue
    }
    for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2))
  }
  return tokens
}

export const useDataStore = defineStore('data', {
  state: () => ({
    index: null as IndexData | null,
    loading: false,
    loadError: '' as string,
    /** topicId -> questions(保持文档原序) */
    topicQuestions: {} as Record<string, Question[]>,
    questionsById: {} as Record<string, Question>,
    search: null as MiniSearch | null,
  }),

  getters: {
    topics(): Topic[] {
      return this.index?.topics ?? []
    },
    /** 按语言取专题——语言列表来自 LANG_META,新增语言不需要改这里 */
    topicsOf(): (language: Language) => Topic[] {
      return (language: Language) => this.topics.filter((t) => t.language === language)
    },
    /** 有题目的语言(按 LANGUAGES 顺序),供首页/筛选栏渲染 */
    activeLanguages(): Language[] {
      const seen = new Set(this.topics.map((t) => t.language))
      return LANGUAGES.filter((l) => seen.has(l))
    },
    allQuestions(): Question[] {
      return Object.values(this.questionsById)
    },
    total(): number {
      return this.index?.counts.total ?? 0
    },
    isReady(): boolean {
      return !!this.index && !!this.search
    },
    topicName(): (topicId: string) => string {
      return (topicId: string) => this.topics.find((t) => t.id === topicId)?.name ?? topicId
    },
  },

  actions: {
    async init() {
      if (this.loading || this.isReady) return
      this.loading = true
      this.loadError = ''
      try {
        const base = import.meta.env.BASE_URL
        const indexRes = await fetch(`${base}data/index.json`)
        if (!indexRes.ok) throw new Error(`加载索引失败(${indexRes.status})`)
        const index = (await indexRes.json()) as IndexData
        // 兼容旧产物:counts 可能缺字段(曾漏写 ai、后来漏写 arch),缺失时按 topics 求和补齐,
        // 否则首页会显示「AI 0 题」。JSON 是外部输入,不能只靠类型断言。
        const derived = { total: 0 } as IndexData['counts']
        for (const l of LANGUAGES) derived[l] = 0
        for (const t of index.topics) {
          derived[t.language] = (derived[t.language] ?? 0) + t.count
          derived.total += t.count
        }
        index.counts = { ...derived, ...index.counts }
        this.index = index

        await Promise.all(
          this.index.topics.map(async (topic) => {
            const res = await fetch(`${base}data/${topic.id}.json`)
            if (!res.ok) throw new Error(`加载 ${topic.name} 失败(${res.status})`)
            const data = (await res.json()) as TopicData
            // 题目是只读数据:markRaw 跳过深层代理,避免 1329 个对象在首次渲染时
            // 被逐个 Proxy 包装(纯开销,无任何响应式收益)
            const questions = data.questions.map((q) => markRaw(q))
            this.topicQuestions[topic.id] = markRaw(questions)
            for (const q of questions) this.questionsById[q.id] = q
          }),
        )

        this.search = new MiniSearch({
          fields: ['title', 'searchText', 'tags', 'no', 'chapter'],
          storeFields: ['id'],
          tokenize: cjkTokenizer,
          searchOptions: {
            boost: { title: 6, tags: 3, no: 2 },
            prefix: true,
            fuzzy: 0.2,
            combineWith: 'AND',
          },
        })
        this.search.addAll(Object.values(this.questionsById))
      } catch (e) {
        this.loadError = e instanceof Error ? e.message : String(e)
      } finally {
        this.loading = false
      }
    },

    questionsOf(topicId: string): Question[] {
      return this.topicQuestions[topicId] ?? []
    },

    /** 全文检索,返回按相关度排序的题目 */
    searchQuestions(query: string, limit = 50): Question[] {
      if (!this.search || !query.trim()) return []
      const hits = this.search.search(query.trim())
      return hits
        .slice(0, limit)
        .map((h) => this.questionsById[h.id as string])
        .filter(Boolean)
    },
  },
})
