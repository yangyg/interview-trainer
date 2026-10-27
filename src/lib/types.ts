export type Language = 'java' | 'go' | 'ai' | 'arch'

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
  /** 各语言题数(arch = 无关语言的架构设计);旧产物可能缺字段,store 会按 topics 补齐 */
  counts: Record<Language, number> & { total: number }
  topics: Topic[]
  topLists: Partial<Record<Language, TopItem[]>>
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

/**
 * 学习进度的持久化结构。
 * 注意:主题不在这里——它由 useTheme 存在独立 key(`interview-trainer/theme`)。
 * 早先这里声明过 settings.theme,但从未被读写,已移除以免误导。
 */
export interface ProgressData {
  version: 1
  cards: Record<string, CardRecord>
  /** YYYY-MM-DD -> 当日学习统计 */
  history: Record<string, DayStats>
}

// ---------- 课程 ----------
// 课程数据由 scripts/build-courses.mjs 在构建期生成,运行时只读。
// 与 ProgressData 完全解耦:课程完成度另存 `interview-trainer/course-v1`。

export type LessonKind = 'concept' | 'drill'

/** 图示:结构化描述,由 LessonDiagram.vue 统一渲染,作者不写 SVG */
export type DiagramSpec =
  | {
      type: 'flow'
      /** h = 横向(桌面)/ 纵向(移动自动降级),v = 始终纵向 */
      direction?: 'h' | 'v'
      items: { label: string; note?: string }[]
      caption?: string
    }
  | {
      type: 'layers'
      /** 数组顺序即自上而下 */
      items: { label: string; note?: string; tone?: 'primary' | 'muted' }[]
      caption?: string
    }
  | {
      type: 'tree'
      root: TreeNode
      caption?: string
    }
  | {
      type: 'matrix'
      /** 可选:表头。若长度为 cols.length + 1,第 0 项即行标签列的表头 */
      head?: string[]
      cols: string[]
      /** 二维数组:每行第 0 格是行标签,其余依次对应 cols */
      rows: string[][]
      caption?: string
    }
  | {
      type: 'memory'
      /** 内存区域,横向并排(窄屏纵向)。顺序即从左到右 */
      regions: {
        name: string
        note?: string
        tone?: 'primary' | 'muted' | 'warn'
        /** 区域内的格子:变量槽、对象实例、类元数据 */
        slots: {
          label: string
          /** 槽里存的值,如 `int 10` / `0x1f2a` */
          value?: string
          /** 引用目标(按另一槽的 label 匹配),渲染成「指向 …」 */
          ref?: string
          tone?: 'primary' | 'warn' | 'muted'
        }[]
      }[]
      caption?: string
    }
  | {
      type: 'sequence'
      /** 参与者,按从左到右列 */
      actors: string[]
      /** 按时间先后排列的消息 */
      messages: { from: string; to: string; text: string; reply?: boolean }[]
      caption?: string
    }
  | {
      type: 'split'
      left: { title: string; items: string[]; tone?: 'bad' | 'warn' | 'good' | 'neutral' }
      right: { title: string; items: string[]; tone?: 'bad' | 'warn' | 'good' | 'neutral' }
      caption?: string
    }
  | {
      type: 'scale'
      items: { label: string; value: number; display: string; note?: string }[]
      caption?: string
    }
  | {
      type: 'state'
      /** 状态既可写成字符串,也可写成对象(带 note / tone) */
      states: (string | { label: string; note?: string; tone?: 'primary' | 'muted' })[]
      /** 相邻状态之间的转移条件,长度 = states.length - 1 */
      transitions?: string[]
      /** 回退边:from / to 均为 1 起的序号 */
      back?: { from: number; to: number; label: string }
      caption?: string
    }

export interface TreeNode {
  label: string
  note?: string
  /** 强调分支:用于标记「这条路径要特别注意」,不影响层级 */
  tone?: 'primary' | 'warn' | 'bad'
  children?: TreeNode[]
}

/** 讲义区块:一段完整的教学动作,按数组顺序渲染 */
export type LessonBlock =
  | {
      kind: 'concept'
      title: string
      /** 定义与释义,每项一段 */
      body: string[]
      /** 术语卡:把关键词钉死 */
      term?: { name: string; def: string }
      points?: string[]
      /** 收口补充:一段不宜打断正文、但必须说的判断 */
      caption?: string
    }
  | {
      kind: 'why'
      title: string
      /** 现象:先摆一个反常的事实,不解释 */
      body: string[]
      /** 现场代码:报错、慢查询计划、错误输出 */
      code?: { language: string; code: string; caption?: string }
      /** 读者会先想到的错解,逐条否掉。这是钩子能成立的关键 */
      wrong?: string[]
      /** 真正的原因:写完这条,读者才觉得「值得往下读」 */
      real?: string
      /** 引出主线:这个答案还差哪一步,所以本课要讲什么 */
      reveal?: string
      /** 反向论证:没有它会退化成什么样 */
      without?: string
    }
  | {
      kind: 'principle'
      title: string
      body?: string[]
      /** 机制拆解,有序步骤 */
      steps: { title: string; detail: string }[]
      /** 收口一句话:这条链路的关键结论 */
      takeaway?: string
      /** 追问与常见误解:挂在机制后面的问答 */
      caption?: string
    }
  | {
      kind: 'analogy'
      title: string
      /** 引子:类比之前先垫一句 */
      body?: string[]
      text: string
      /** 类比映射:现实物 -> 技术物 */
      mapping?: { real: string; tech: string }[]
      /** 类比的适用边界,过了这里就不成立 */
      limit?: string
    }
  | {
      kind: 'diagram'
      title: string
      /** 读图前的一句引导,渲染在图上方 */
      body?: string[]
      diagram: DiagramSpec
      /** 读图后的收口结论,渲染在图下方 */
      caption?: string
    }
  | {
      kind: 'compare'
      title: string
      /** 对比前的判据说明,渲染在表上方 */
      body?: string[]
      head: string[]
      rows: string[][]
      note?: string
      /** 选型收口结论,渲染在表下方 */
      caption?: string
    }
  | {
      kind: 'code'
      title: string
      /** 读代码前的一句引导,渲染在代码框上方 */
      body?: string[]
      lang: string
      code: string
      caption?: string
      /** 关键行讲解 */
      notes?: { line: string; text: string }[]
      /** 代码之后的一段整体点评(与逐行 notes 互补) */
      note?: string
      /** 影响默认值或行为的前提,如 'MySQL 8.0' / 'JDK 21' / 'Spring Boot 3.2' */
      version?: string
      /** 运行环境补充,如 'Linux x86_64, 16C32G' */
      env?: string
      /** 是否实际运行过。false 时页面强制打「未验证」标记 */
      verified?: boolean
    }
  | {
      kind: 'explore'
      title: string
      /** 六问的前半段:我们此刻在讲的这条知识 */
      from: string
      /** 1-2 个分支。每个都必须答全四问,只列名字的分支会被构建拦掉 */
      branches: {
        /** down=向下深入 lateral=横向比较 cross=跨领域迁移 outward=向外延伸 reverse=反向探索 */
        direction: 'down' | 'lateral' | 'cross' | 'outward' | 'reverse'
        /** 关联知识:接下来探索什么 */
        related: string
        /** 联系依据:两者共享什么问题、原理或设计目标 */
        basis: string
        /** 相似之处 */
        shared: string
        /** 不同之处:哪些机制或结果不能混为一谈 */
        diff: string
        /** 探索价值:理解这个联系后多知道了什么 */
        value: string
      }[]
    }
  | {
      kind: 'handwrite'
      title: string
      /** java / go / sql / python */
      lang: string
      /** 面试官会怎么问:先把题目说清 */
      prompt: string
      /** 方法签名,先定接口再写实现 */
      signature?: string
      /** 思路,按顺序讲 */
      plan: { title: string; detail: string }[]
      /** 骨架:留 TODO,让读者先自己填 */
      skeleton?: string
      /** 参考实现,默认折叠 */
      solution: string
      /** 时间 / 空间复杂度 */
      complexity?: string
      /** 现场容易写错的地方 */
      traps?: string[]
    }
  | {
      kind: 'question'
      title: string
      /** 必须属于本课时的 questionIds */
      questionId: string
      /** 考官问这句话时真正在筛什么 */
      intent: string
      /** 回答骨架,按顺序说 */
      points: string[]
      /** 决定分档的细节 */
      depth?: string
      /** 追问怎么接 */
      followup?: string
    }

export interface LessonContent {
  /** 150-300 字导语,纯文本,`\n\n` 分段(不用 HTML) */
  intro: string
  /** 教学主体。空数组 = 老数据,只渲染提纲 */
  sections?: LessonBlock[]
  /** 3-5 条知识骨架 */
  outline: string[]
  /** 1-3 条边界、陷阱、面试失分点 */
  pitfalls: string[]
}

export interface Lesson {
  /** 课程内唯一 slug,禁止用数组下标 */
  id: string
  title: string
  kind: LessonKind
  content: LessonContent
  /** 按教学顺序排列,客户端只认这个顺序 */
  questionIds: string[]
  estimatedMinutes: number
}

export interface Stage {
  id: string
  title: string
  /** 一句话阶段目标 */
  goal: string
  /** 60-120 字阶段导语 */
  summary: string
  lessons: Lesson[]
  /** 阶段验收:题目全部取自本阶段各课时 */
  checkpoint: {
    questionIds: string[]
    /** 通过线 0-1 */
    passRatio: number
  }
}

export interface CourseSummary {
  id: string
  language: Language
  title: string
  subtitle: string
  level: 'intro' | 'advanced' | 'expert'
  prerequisites: string[]
  /** 4-6 条「学完你能…」 */
  outcomes: string[]
  /** 同语言内的推荐学习顺序,从 1 开始 */
  order: number
  firstLessonId: string
  stageCount: number
  lessonCount: number
  /** 去重后的覆盖题数 */
  uniqueQuestionCount: number
  estimatedMinutes: number
}

export interface Course extends CourseSummary {
  version: 1
  stages: Stage[]
}

export interface CourseIndex {
  version: 1
  /** 源 index.json 的 generatedAt,用于检测课程数据是否过期 */
  sourceIndexGeneratedAt: string
  /** 课程内容指纹,内容不变则不重写文件 */
  buildHash: string
  courses: CourseSummary[]
}

export interface CourseProgressData {
  version: 1
  /** key = `${courseId}/${lessonId}` */
  lessons: Record<string, { completedAt: number }>
  /** 最近进入的课时,供首页「继续学习」 */
  lastLesson?: { courseId: string; lessonId: string; at: number }
}
