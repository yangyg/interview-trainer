import { defineStore } from 'pinia'
import type MiniSearch from 'minisearch'
import { markRaw } from 'vue'
import { LANGUAGES } from '@/lib/langs'
import { createQuestionSearch } from '@/lib/search'
import type { IndexData, Language, Question, Topic, TopicData } from '@/lib/types'

export const useDataStore = defineStore('data', {
  state: () => ({
    index: null as IndexData | null,
    loading: false,
    loadError: '' as string,
    /** 题库正文是否已全部载入——页面渲染只依赖它,不等搜索索引 */
    contentReady: false,
    /** 全文索引是否可用;在首屏渲染后空闲时构建 */
    searchReady: false,
    searchBuilding: false,
    searchError: '' as string,
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
      return this.contentReady
    },
    topicName(): (topicId: string) => string {
      return (topicId: string) => this.topics.find((t) => t.id === topicId)?.name ?? topicId
    },
  },

  actions: {
    async init() {
      if (this.loading || this.contentReady) return
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

        // 全量预载:当前 1421 题约 3MB。增长到 ~3000 题前应改为按语言分片,
        // 否则首屏请求数与内存会随题库线性增长。
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

        this.contentReady = true
        this.scheduleSearchIndex()
      } catch (e) {
        this.loadError = e instanceof Error ? e.message : String(e)
      } finally {
        this.loading = false
      }
    },

    /** 首屏渲染后空闲再建索引:600ms 级别的构建不能挡住页面门控 */
    scheduleSearchIndex() {
      const run = () => void this.buildSearchIndex()
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 2000 })
      } else {
        setTimeout(run, 0)
      }
    },

    /**
     * 分片构建,每片之间让出主线程,避免一次 600ms 长任务卡住输入。
     * 索引建好前 searchQuestions 返回空,由调用方显示「索引构建中」。
     */
    async buildSearchIndex() {
      if (this.searchReady || this.searchBuilding || !this.index) return
      this.searchBuilding = true
      this.searchError = ''
      try {
        const mini = createQuestionSearch()
        const all = Object.values(this.questionsById)
        const CHUNK = 100
        for (let i = 0; i < all.length; i += CHUNK) {
          mini.addAll(all.slice(i, i + CHUNK))
          if (i + CHUNK < all.length) await new Promise((resolve) => setTimeout(resolve, 0))
        }
        this.search = markRaw(mini)
        this.searchReady = true
      } catch (e) {
        this.searchError = e instanceof Error ? e.message : String(e)
      } finally {
        this.searchBuilding = false
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
