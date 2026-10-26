// 课程作者源的共享约定。build-courses.mjs 与各课程文件都从这里取规则。

/** 伪章节:解析器产物里不应进入课程的「来源清单」类章节 */
export const PSEUDO_CHAPTER = /^(来源清单|附[:：]|补充[:：]|目录$|附录)/

/** 课程 / 阶段 / 课时 id 规则 */
export const ID_RE = /^[a-z0-9][a-z0-9-]*$/

/** 题量边界:concept 课时 4-18,drill 课时 4-24(手撕/代码输出题单偏长) */
export const LIMITS = {
  conceptMin: 4,
  conceptMax: 18,
  drillMin: 4,
  drillMax: 24,
  introMin: 150,
  introMax: 340,
  outlineMin: 3,
  outlineMax: 5,
  pitfallMin: 1,
  pitfallMax: 3,
  stageMin: 2,
  stageMax: 6,
  // ---- 讲义 v2:教学段落 ----
  /** 一节课至少 5 个教学动作,否则还是提纲;上限放宽到 20,给图示留余量 */
  sectionMin: 5,
  sectionMax: 20,
  /** 正文下限(不含 intro):低于这个数说明只写了骨架 */
  bodyMin: 1100,
  /** 单个段落的下限,防「标题 + 一句话」凑数 */
  sectionBodyMin: 60,
}

/** 允许的区块类型 */
export const BLOCK_KINDS = new Set([
  'concept',
  'why',
  'principle',
  'analogy',
  'diagram',
  'compare',
  'code',
  'handwrite',
  'question',
])

/**
 * 图示类型
 * - flow / layers / tree / matrix:结构类
 * - memory:内存区域 + 槽位 + 引用指向(讲对象、栈帧、常量池)
 * - sequence:参与者 + 时序消息(讲类加载、CAS、请求链路)
 * - split:左右对照(讲错误写法 vs 正确写法)
 * - scale:量级条形(讲复杂度、耗时、内存占用)
 * - state:状态流转 + 回退边(讲线程状态、连接状态、SRS 盒)
 */
export const DIAGRAM_TYPES = new Set([
  'flow',
  'layers',
  'tree',
  'matrix',
  'memory',
  'sequence',
  'split',
  'scale',
  'state',
])

/**
 * @typedef {Object} SourceSelector
 * @property {string} topic            topicId,如 'java-02'
 * @property {string[]} [chapters]     章节关键词,归一化后做唯一子串匹配
 * @property {[number, number]} [slice] 命中后按源顺序切片,用于拆分大章节
 *
 * @typedef {Object} LessonSpec
 * @property {string} id
 * @property {string} title
 * @property {'concept'|'drill'} [kind]
 * @property {SourceSelector[]} [sources]
 * @property {string[]} [questionIds]   与 sources 二选一
 * @property {string[]} [pick]          按给定顺序裁剪/重排
 * @property {string[]} [exclude]
 * @property {'source'|'no'|'frequency'} [order]
 * @property {{intro: string, outline: string[], pitfalls: string[]}} content
 *
 * @typedef {Object} StageSpec
 * @property {string} id
 * @property {string} title
 * @property {string} goal
 * @property {string} summary
 * @property {LessonSpec[]} lessons
 *
 * @typedef {Object} CourseSpec
 * @property {string} id
 * @property {'java'|'go'|'ai'} language
 * @property {string} title
 * @property {string} subtitle
 * @property {'intro'|'advanced'|'expert'} [level]
 * @property {number} [order]
 * @property {string[]} [prerequisites]
 * @property {string[]} [outcomes]
 * @property {StageSpec[]} stages
 * @property {{id: string, reason: string}[]} [excluded]
 */
export {}
