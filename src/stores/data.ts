import MiniSearch from 'minisearch'
import { defineStore } from 'pinia'
import type { IndexData, Question, Topic, TopicData } from '@/lib/types'

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
    javaTopics(): Topic[] {
      return this.topics.filter((t) => t.language === 'java')
    },
    goTopics(): Topic[] {
      return this.topics.filter((t) => t.language === 'go')
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
        this.index = (await indexRes.json()) as IndexData

        await Promise.all(
          this.index.topics.map(async (topic) => {
            const res = await fetch(`${base}data/${topic.id}.json`)
            if (!res.ok) throw new Error(`加载 ${topic.name} 失败(${res.status})`)
            const data = (await res.json()) as TopicData
            this.topicQuestions[topic.id] = data.questions
            for (const q of data.questions) this.questionsById[q.id] = q
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
