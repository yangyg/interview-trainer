export type Language = 'java' | 'go' | 'ai'

export interface SourceRef {
  title?: string
  url: string
}

export interface Question {
  id: string
  language: Language
  topicId: string
  chapter: string
  no: string
  title: string
  /** 🔥 数量 1-5;Go 题库仅标 ⭐ 高频(记 3),未标为 null */
  frequency: number | null
  /** ⭐ 数量 1-5;Go 题库无难度标注 */
  difficulty: number | null
  answerHtml: string
  searchText: string
  sources: SourceRef[]
  tags: string[]
}

export interface ChapterInfo {
  name: string
  count: number
}

export interface Topic {
  id: string
  language: Language
  name: string
  file: string
  count: number
  chapters: ChapterInfo[]
}

export interface TopItem {
  rank: number
  title: string
  location?: string
  note?: string
  questionId?: string | null
}

export interface DocMeta {
  id: string
  language: Language
  title: string
  description: string
}

export interface IndexData {
  generatedAt: string
  counts: { java: number; go: number; ai: number; total: number }
  topics: Topic[]
  topLists: { java: TopItem[]; go: TopItem[]; ai: TopItem[] }
  docs: DocMeta[]
}

export interface TopicData {
  topicId: string
  questions: Question[]
}

// ---------- 学习进度 ----------

export type CardStatus = 'mastered' | 'fuzzy' | 'wrong'
export type GradeResult = CardStatus

export interface CardRecord {
  status: CardStatus
  /** Leitner 盒级 0-5 */
  box: number
  /** 下次到期时间戳(ms) */
  due: number
  lastTs: number
  reviews: number
}

export interface DayStats {
  studied: number
  quiz: number
  quizTotal: number
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ProgressData {
  version: 1
  cards: Record<string, CardRecord>
  /** YYYY-MM-DD -> 当日学习统计 */
  history: Record<string, DayStats>
  settings: {
    theme: ThemeMode
  }
}
