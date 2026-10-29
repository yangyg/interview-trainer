#!/usr/bin/env node
/**
 * 课程构建脚本
 *
 * 读 public/data/index.json + 各 topic JSON,把 scripts/curriculum/ 下的课程作者源
 * (标题 / 讲义 / 章节选择器)解析成静态课程数据:
 *   public/data/courses/index.json        课程摘要列表
 *   public/data/courses/<courseId>.json   课程全文(阶段 / 课时 / questionIds)
 *   scripts/curriculum/.report.json       覆盖率报告(不入库)
 *
 * 用法:
 *   node scripts/build-courses.mjs            生成
 *   node scripts/build-courses.mjs --check    只校验,不写盘
 *   node scripts/build-courses.mjs --skeleton 跳过讲义长度校验(骨架阶段)
 *   node scripts/build-courses.mjs --partial  跳过全局覆盖率校验(分批写作时)
 *   node scripts/build-courses.mjs --verbose  逐课打印首末题
 *   node scripts/build-courses.mjs --audit    打印教学审计的逐条警告(默认只给计数)
 *
 * 除课程产物外,还会写出 scripts/curriculum/.blockindex.json(块地址 → 指纹),
 * 供 scripts/course-tool.mjs 定位与改块;该文件不入库。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { COURSES } from './curriculum/index.mjs'
import {
  PSEUDO_CHAPTER,
  ID_RE,
  LIMITS,
  BLOCK_KINDS,
  BLOCK_FIELDS,
  DIAGRAM_TYPES,
  EXPLORE_DIRECTIONS,
  EXPLORE_BRANCH_MAX,
} from './curriculum/schema.mjs'
import { hashBlock, hashSections, auditCourses, summarizeAudit } from './curriculum/audit.mjs'

/** explore 分支必填字段的中文名,报错时直接告诉作者该写什么 */
const EXPLORE_FIELD_LABEL = {
  related: '关联知识',
  basis: '联系依据',
  shared: '相似之处',
  diff: '不同之处',
  value: '探索价值',
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public/data')
const OUT_DIR = path.join(DATA_DIR, 'courses')
const REPORT_PATH = path.join(__dirname, 'curriculum/.report.json')
const BLOCK_INDEX_PATH = path.join(__dirname, 'curriculum/.blockindex.json')

const flags = new Set(process.argv.slice(2))
const CHECK_ONLY = flags.has('--check')
const SKELETON = flags.has('--skeleton')
const PARTIAL = flags.has('--partial')
const VERBOSE = flags.has('--verbose')
const SHOW_AUDIT = flags.has('--audit')

const problems = []
const fail = (msg) => problems.push(msg)

// ---------- 讲义 v2 计数与校验 ----------

/** 统计讲义正文长度(不含 intro)。图示里的文字也算,否则「画个图凑数」能骗过校验 */
function countSectionChars(sections = []) {
  let n = 0
  const add = (s) => {
    if (typeof s === 'string') n += s.trim().length
  }
  const walkNode = (node) => {
    if (!node) return
    add(node.label)
    add(node.note)
    for (const c of node.children ?? []) walkNode(c)
  }
  for (const s of sections) {
    if (!s || typeof s !== 'object') continue
    add(s.title)
    for (const p of s.body ?? []) add(p)
    add(s.term?.name)
    add(s.term?.def)
    for (const p of s.points ?? []) add(p)
    add(s.text)
    for (const m of s.mapping ?? []) {
      add(m.real)
      add(m.tech)
    }
    add(s.limit)
    for (const st of s.steps ?? []) {
      add(st.title)
      add(st.detail)
    }
    add(s.takeaway)
    for (const c of s.head ?? []) add(c)
    for (const row of s.rows ?? []) for (const c of row ?? []) add(c)
    add(s.note)
    add(s.code)
    add(s.caption)
    for (const nt of s.notes ?? []) {
      add(nt.line)
      add(nt.text)
    }
    add(s.intent)
    add(s.depth)
    add(s.followup)
    // explore:当前知识 + 每个分支的四问
    add(s.from)
    for (const b of s.branches ?? []) {
      add(b.related)
      add(b.basis)
      add(b.shared)
      add(b.diff)
      add(b.value)
    }
    // handwrite:手写题的全部文字都算,包括骨架与参考实现
    add(s.prompt)
    add(s.signature)
    add(s.skeleton)
    add(s.solution)
    add(s.complexity)
    for (const t of s.traps ?? []) add(t)
    for (const st of s.plan ?? []) {
      add(st.title)
      add(st.detail)
    }
    const d = s.diagram
    if (d) {
      for (const it of d.items ?? []) {
        add(it.label)
        add(it.note)
        add(it.display)
      }
      for (const c of d.cols ?? []) add(c)
      for (const row of d.rows ?? []) for (const c of row ?? []) add(c)
      walkNode(d.root)
      // memory
      for (const r of d.regions ?? []) {
        add(r.name)
        add(r.note)
        for (const sl of r.slots ?? []) {
          add(sl.label)
          add(sl.value)
          add(sl.ref)
        }
      }
      // sequence
      for (const a of d.actors ?? []) add(a)
      for (const m of d.messages ?? []) {
        add(m.from)
        add(m.to)
        add(m.text)
      }
      // split
      for (const side of [d.left, d.right]) {
        if (!side) continue
        add(side.title)
        for (const it of side.items ?? []) add(it)
      }
      // state:允许字符串或对象两种写法
      for (const st of d.states ?? []) {
        if (typeof st === 'string') add(st)
        else {
          add(st.label)
          add(st.note)
        }
      }
      for (const t of d.transitions ?? []) add(t)
      add(d.back?.label)
      add(d.caption)
    }
  }
  return n
}

/** 讲义 v2 校验:只对写了 sections 的课时生效,老课时保持原规则 */
function validateSections(sections, ids, where) {
  if (!Array.isArray(sections) || !sections.length) return 0

  if (sections.length < LIMITS.sectionMin || sections.length > LIMITS.sectionMax) {
    fail(
      `${where}: sections ${sections.length} 个,要求 ${LIMITS.sectionMin}-${LIMITS.sectionMax}`,
    )
  }

  const kinds = new Set()
  for (const [i, s] of sections.entries()) {
    const at = `${where}/s${i + 1}`
    if (!s || typeof s !== 'object') {
      fail(`${at}: 区块不是对象`)
      continue
    }
    if (!BLOCK_KINDS.has(s.kind)) {
      fail(`${at}: 未知区块类型 ${JSON.stringify(s.kind)}`)
      continue
    }
    kinds.add(s.kind)
    if (!s.title || !String(s.title).trim()) fail(`${at}: 缺少 title`)

    // 字段白名单:写错的字段名会被渲染器静默忽略,页面看着正常、内容其实没了
    const allowed = BLOCK_FIELDS[s.kind]
    if (allowed) {
      const unknown = Object.keys(s).filter((f) => !allowed.includes(f))
      if (unknown.length) {
        fail(
          `${at}(${s.kind}): 未知字段 ${unknown.join(', ')}——渲染器不会读它,内容会静默消失。` +
            `允许的字段:${allowed.join(' / ')}`,
        )
      }
    }

    // 单一区块下限定成「至少说了点什么」,防止标题党
    const own = countSectionChars([s])
    if (own < LIMITS.sectionBodyMin) {
      fail(`${at}(${s.kind}): 只有 ${own} 字,至少 ${LIMITS.sectionBodyMin}`)
    }

    if (s.kind === 'question') {
      if (!ids.includes(s.questionId)) {
        fail(`${at}: questionId ${s.questionId} 不属于本课时`)
      }
      if (!Array.isArray(s.points) || s.points.length < 2) {
        fail(`${at}: 真题拆解至少要 2 步回答骨架`)
      }
    }
    if (s.kind === 'principle') {
      if (!Array.isArray(s.steps) || s.steps.length < 2) {
        fail(`${at}: principle 至少要 2 个步骤`)
      }
    }
    if (s.kind === 'compare') {
      if (!Array.isArray(s.head) || s.head.length < 2) fail(`${at}: 对比表至少要 2 列`)
      if (!Array.isArray(s.rows) || s.rows.length < 2) fail(`${at}: 对比表至少要 2 行`)
      for (const row of s.rows ?? []) {
        if (!Array.isArray(row) || row.length !== s.head.length) {
          fail(`${at}: 对比表行列数不一致`)
          break
        }
      }
    }
    if (s.kind === 'diagram') {
      const d = s.diagram
      if (!d || !DIAGRAM_TYPES.has(d.type)) {
        fail(`${at}: 未知图示类型 ${JSON.stringify(d?.type)}`)
      } else if (d.type === 'matrix') {
        if (!Array.isArray(d.cols) || d.cols.length < 2) fail(`${at}: matrix 至少要 2 列`)
        for (const row of d.rows ?? []) {
          if (!Array.isArray(row) || row.length !== (d.cols?.length ?? 0) + 1) {
            fail(`${at}: matrix 每行应为 ${(d.cols?.length ?? 0) + 1} 格(行标签 + 各列)`)
            break
          }
        }
        if (!(d.rows ?? []).length) fail(`${at}: matrix 没有数据行`)
      } else if (d.type === 'memory') {
        const regions = d.regions ?? []
        if (regions.length < 2) fail(`${at}: memory 至少要 2 个内存区域`)
        for (const [ri, r] of regions.entries()) {
          if (!r?.name) fail(`${at}: memory 第 ${ri + 1} 个区域缺少 name`)
          if (!(r?.slots ?? []).length) fail(`${at}: memory 区域「${r?.name}」没有槽位`)
        }
      } else if (d.type === 'sequence') {
        if ((d.actors ?? []).length < 2) fail(`${at}: sequence 至少要 2 个参与者`)
        if ((d.messages ?? []).length < 2) fail(`${at}: sequence 至少要 2 条消息`)
        const actors = new Set(d.actors ?? [])
        for (const m of d.messages ?? []) {
          if (!actors.has(m.from) || !actors.has(m.to)) {
            fail(`${at}: sequence 消息的 from/to 必须是已声明的参与者(${m.from} → ${m.to})`)
            break
          }
        }
      } else if (d.type === 'split') {
        for (const key of ['left', 'right']) {
          const side = d[key]
          if (!side?.title) fail(`${at}: split.${key} 缺少 title`)
          if (!(side?.items ?? []).length) fail(`${at}: split.${key} 没有条目`)
        }
      } else if (d.type === 'scale') {
        if ((d.items ?? []).length < 2) fail(`${at}: scale 至少要 2 条`)
        for (const it of d.items ?? []) {
          if (typeof it.value !== 'number' || Number.isNaN(it.value)) {
            fail(`${at}: scale 的 value 必须是数字(${it.label})`)
            break
          }
          if (!it.display) fail(`${at}: scale 缺少 display(${it.label})`)
        }
      } else if (d.type === 'state') {
        const n = (d.states ?? []).length
        if (n < 2) fail(`${at}: state 至少要 2 个状态`)
        if (d.transitions && d.transitions.length !== n - 1) {
          fail(`${at}: state.transitions 应为 ${n - 1} 条(状态数 - 1)`)
        }
        if (d.back) {
          const { from, to } = d.back
          if (!(from >= 1 && from <= n) || !(to >= 1 && to <= n)) {
            fail(`${at}: state.back 的 from/to 必须在 1-${n} 之间`)
          }
          if (!d.back.label) fail(`${at}: state.back 缺少 label`)
        }
      } else if (d.type === 'tree' ? !d.root : !(d.items?.length || d.rows?.length)) {
        fail(`${at}: 图示没有内容`)
      }
    }
    if (s.kind === 'code' && (!s.code || !String(s.code).trim())) {
      fail(`${at}: code 区块缺少代码`)
    }
    // 版本与验证状态:字段存在才算数,不写就不渲染 —— 但不能写错类型静默失效
    if (s.kind === 'code') {
      if (typeof s.code !== 'string' || !s.code.trim()) {
        fail(`${at}: code 必须是字符串(写成 { language, code } 对象会把整个对象渲染到页面上)`)
      }
      if (!s.lang || typeof s.lang !== 'string') {
        fail(`${at}: code 缺少 lang(语言标签会渲染为空)`)
      }
      if (s.version !== undefined && typeof s.version !== 'string') {
        fail(`${at}: code.version 应为字符串(如 'MySQL 8.0' / 'JDK 21')`)
      }
      if (s.env !== undefined && typeof s.env !== 'string') {
        fail(`${at}: code.env 应为字符串`)
      }
      if (s.verified !== undefined && typeof s.verified !== 'boolean') {
        fail(`${at}: code.verified 应为布尔值(true 表示实际跑过)`)
      }
    }
    // explore:《规范》6.3 的六问缺一项就不算建立了联系,只列名字的分支要拦掉
    if (s.kind === 'explore') {
      if (!s.from || !String(s.from).trim()) {
        fail(`${at}: explore 缺少 from(当前知识:我们刚学的是什么)`)
      }
      const branches = s.branches ?? []
      if (!branches.length) fail(`${at}: explore 至少要 1 个分支`)
      if (branches.length > EXPLORE_BRANCH_MAX) {
        fail(`${at}: explore 有 ${branches.length} 个分支,最多 ${EXPLORE_BRANCH_MAX} 个(多了就是另开一课)`)
      }
      for (const [bi, b] of branches.entries()) {
        if (!EXPLORE_DIRECTIONS.has(b?.direction)) {
          fail(
            `${at}: 第 ${bi + 1} 个分支方向 ${JSON.stringify(b?.direction)} 不合法` +
              `(可选 ${[...EXPLORE_DIRECTIONS.keys()].join(' / ')})`,
          )
          continue
        }
        for (const key of ['related', 'basis', 'shared', 'diff', 'value']) {
          if (!b[key] || !String(b[key]).trim()) {
            fail(`${at}: 第 ${bi + 1} 个分支缺少 ${key}(${EXPLORE_FIELD_LABEL[key]})`)
          }
        }
      }
    }
    // analogy 的正文在 text 里(不是 body),mapping 用 real/tech —— 写错会静默白屏,这里卡住
    if (s.kind === 'analogy') {
      if (!s.text || !String(s.text).trim()) {
        fail(`${at}: analogy 缺少 text(正文)`)
      }
      for (const m of s.mapping ?? []) {
        if (!m?.real || !m?.tech) {
          fail(`${at}: analogy.mapping 每项需要 real 与 tech`)
          break
        }
      }
    }
    if (s.kind === 'handwrite') {
      if (!s.prompt || !String(s.prompt).trim()) fail(`${at}: handwrite 缺少 prompt`)
      if (!s.solution || !String(s.solution).trim()) fail(`${at}: handwrite 缺少参考实现`)
      if (!s.lang) fail(`${at}: handwrite 缺少 lang`)
      if (!Array.isArray(s.plan) || s.plan.length < 2) {
        fail(`${at}: handwrite 至少要 2 步思路`)
      }
      for (const st of s.plan ?? []) {
        if (!st?.title || !st?.detail) {
          fail(`${at}: handwrite 的每一步都要有 title 与 detail`)
          break
        }
      }
      // 骨架必须真的留了空:全是答案的「骨架」没有意义
      if (s.skeleton && !/TODO/.test(s.skeleton)) {
        fail(`${at}: handwrite 的 skeleton 应至少留一个 TODO`)
      }
    }
  }

  // 一节真正的课:必须讲清「是什么」和「怎么运作」
  for (const req of ['concept', 'principle']) {
    if (!kinds.has(req)) fail(`${where}: 缺少 ${req} 区块`)
  }
  // 还要有至少一种「让抽象变具体」的手段
  if (!['analogy', 'diagram', 'compare'].some((k) => kinds.has(k))) {
    fail(`${where}: analogy / diagram / compare 至少要有一个`)
  }
  // 且必须把讲义落到真题上
  if (!kinds.has('question')) fail(`${where}: 缺少 question 真题拆解`)

  const total = countSectionChars(sections)
  if (total < LIMITS.bodyMin) {
    fail(`${where}: 讲义正文 ${total} 字,至少 ${LIMITS.bodyMin}`)
  }
  return total
}

// ---------- 读取题库 ----------

if (!fs.existsSync(path.join(DATA_DIR, 'index.json'))) {
  console.warn('⚠️  未找到 public/data/index.json,跳过课程构建(保留已提交的课程产物)。')
  console.warn('   如需重新生成题库,先运行 npm run parse。')
  process.exit(0)
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const index = readJson(path.join(DATA_DIR, 'index.json'))

/** topicId -> Question[] (源文档顺序) */
const topicQuestions = new Map()
/** questionId -> Question */
const questionById = new Map()

for (const topic of index.topics) {
  const file = path.join(DATA_DIR, `${topic.id}.json`)
  if (!fs.existsSync(file)) {
    fail(`缺少题库文件 public/data/${topic.id}.json`)
    continue
  }
  const questions = readJson(file).questions ?? []
  topicQuestions.set(topic.id, questions)
  for (const q of questions) questionById.set(q.id, q)
}

// ---------- 章节匹配 ----------

/** 去掉「第X章」「一、」「3.」等编号,统一全半角与分隔符,便于局部关键词匹配 */
function normalizeChapter(name) {
  return name
    .replace(/^第\s*[一二三四五六七八九十百千0-9]+\s*[章节课]\s*/, '')
    .replace(/^[一二三四五六七八九十百]+\s*、\s*/, '')
    .replace(/^[0-9]+\s*[.、]\s*/, '')
    .replace(/[·・•‧]/g, '')
    .replace(/[（）()【】[\]]/g, '')
    .replace(/[\s\u3000]/g, '')
    .toLowerCase()
}

function matchChapter(topicId, wanted, where) {
  const questions = topicQuestions.get(topicId)
  if (!questions) {
    fail(`${where}: 未知 topic「${topicId}」`)
    return null
  }
  const names = [...new Set(questions.map((q) => q.chapter))]
  const key = normalizeChapter(wanted)
  if (!key) {
    fail(`${where}: 章节关键词为空`)
    return null
  }

  const exact = names.filter((n) => n === wanted)
  if (exact.length === 1) return exact[0]
  const equal = names.filter((n) => normalizeChapter(n) === key)
  if (equal.length === 1) return equal[0]
  const partial = names.filter((n) => normalizeChapter(n).includes(key))
  if (partial.length === 1) return partial[0]

  if (partial.length > 1) {
    fail(`${where}: 章节「${wanted}」在 ${topicId} 命中多个,请写更精确 —— ${partial.join(' / ')}`)
  } else {
    fail(`${where}: 章节「${wanted}」在 ${topicId} 无命中,可选 —— ${names.join(' / ')}`)
  }
  return null
}

// ---------- 课时题目解析 ----------

function sortByNo(list) {
  const num = (q) => {
    const m = /^[QC](\d+)$/.exec(q.no)
    return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER
  }
  return [...list].sort((a, b) => num(a) - num(b))
}

function resolveLesson(courseId, stageId, lesson) {
  const where = `${courseId}/${stageId}/${lesson.id}`
  let picked = []

  if (lesson.questionIds?.length) {
    for (const id of lesson.questionIds) {
      const q = questionById.get(id)
      if (!q) fail(`${where}: 题目 id 不存在「${id}」`)
      else picked.push(q)
    }
  } else if (lesson.sources?.length) {
    for (const src of lesson.sources) {
      const questions = topicQuestions.get(src.topic)
      if (!questions) {
        fail(`${where}: 未知 topic「${src.topic}」`)
        continue
      }
      let slice = questions
      if (src.chapters?.length) {
        const real = src.chapters
          .map((c) => matchChapter(src.topic, c, where))
          .filter(Boolean)
        if (real.length !== src.chapters.length) continue
        const set = new Set(real)
        slice = questions.filter((q) => set.has(q.chapter))
      }
      if (src.slice) {
        const [from, to] = src.slice
        slice = slice.slice(from, to)
      }
      if (!slice.length) fail(`${where}: 选择器命中 0 题(${src.topic} / ${(src.chapters ?? []).join('+')})`)
      picked.push(...slice)
    }
  } else {
    fail(`${where}: 必须提供 sources 或 questionIds`)
  }

  if (lesson.exclude?.length) {
    const drop = new Set(lesson.exclude)
    picked = picked.filter((q) => !drop.has(q.id))
  }

  if (lesson.pick?.length) {
    const byId = new Map(picked.map((q) => [q.id, q]))
    const next = []
    for (const id of lesson.pick) {
      const q = byId.get(id)
      if (!q) fail(`${where}: pick 中的「${id}」不在选择器结果内`)
      else next.push(q)
    }
    picked = next
  }

  if (lesson.order === 'no') picked = sortByNo(picked)
  if (lesson.order === 'frequency') {
    picked = [...picked].sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
  }

  // 去重(同一课时内)
  const seen = new Set()
  picked = picked.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)))

  return picked
}

// ---------- 阶段验收(自动抽取) ----------

function buildCheckpoint(stageLessonIds, stageSpec) {
  const ordered = []
  for (const lesson of stageSpec.lessons) {
    for (const id of lesson.questionIds ?? []) {
      if (!ordered.includes(id)) ordered.push(id)
    }
  }
  const explicit = stageSpec.checkpoint?.questionIds
  if (explicit?.length) return explicit.filter((id) => ordered.includes(id))

  const score = (id) => {
    const q = questionById.get(id)
    if (!q) return 0
    return (q.frequency ?? 2) * 10 - (q.difficulty ?? 3)
  }
  const count = Math.min(15, Math.max(8, Math.round(ordered.length * 0.5)))
  const chosen = new Set(
    [...ordered].sort((a, b) => score(b) - score(a)).slice(0, Math.min(count, ordered.length)),
  )
  return ordered.filter((id) => chosen.has(id))
}

// ---------- 主流程 ----------

const resolvedCourses = []
const assigned = new Set()
const excludedAll = new Map()

const courseIds = new Set()
const globalLessonKeys = new Set()

for (const spec of COURSES) {
  const where = `课程「${spec.id}」`
  if (!ID_RE.test(spec.id)) fail(`${where}: id 不合规`)
  if (courseIds.has(spec.id)) fail(`${where}: id 重复`)
  courseIds.add(spec.id)

  const stages = []
  const stageIds = new Set()
  const courseAssigned = new Set()

  for (const stageSpec of spec.stages ?? []) {
    const swhere = `${spec.id}/${stageSpec.id}`
    if (!ID_RE.test(stageSpec.id)) fail(`${swhere}: 阶段 id 不合规`)
    if (stageIds.has(stageSpec.id)) fail(`${swhere}: 阶段 id 重复`)
    stageIds.add(stageSpec.id)

    const lessons = []
    const lessonIds = new Set()
    let stagePrevIds = []

    for (const lessonSpec of stageSpec.lessons ?? []) {
      const lwhere = `${swhere}/${lessonSpec.id}`
      if (!ID_RE.test(lessonSpec.id)) fail(`${lwhere}: 课时 id 不合规`)
      if (lessonIds.has(lessonSpec.id)) fail(`${lwhere}: 课时 id 重复`)
      if (globalLessonKeys.has(`${spec.id}/${lessonSpec.id}`)) fail(`${lwhere}: 课时 key 重复`)
      lessonIds.add(lessonSpec.id)
      globalLessonKeys.add(`${spec.id}/${lessonSpec.id}`)

      const kind = lessonSpec.kind ?? 'concept'
      const questions = resolveLesson(spec.id, stageSpec.id, lessonSpec)
      const ids = questions.map((q) => q.id)

      const min = kind === 'drill' ? LIMITS.drillMin : LIMITS.conceptMin
      const max = kind === 'drill' ? LIMITS.drillMax : LIMITS.conceptMax
      if (ids.length < min || ids.length > max) {
        fail(`${lwhere}: ${ids.length} 题,${kind} 课时要求 ${min}-${max}`)
      }

      const content = lessonSpec.content ?? {}
      let bodyChars = 0
      if (!SKELETON) {
        const len = (content.intro ?? '').trim().length
        if (len < LIMITS.introMin || len > LIMITS.introMax) {
          fail(`${lwhere}: intro ${len} 字,要求 ${LIMITS.introMin}-${LIMITS.introMax}`)
        }
        const outline = content.outline ?? []
        if (outline.length < LIMITS.outlineMin || outline.length > LIMITS.outlineMax) {
          fail(`${lwhere}: outline ${outline.length} 条,要求 ${LIMITS.outlineMin}-${LIMITS.outlineMax}`)
        }
        const pitfalls = content.pitfalls ?? []
        if (pitfalls.length < LIMITS.pitfallMin || pitfalls.length > LIMITS.pitfallMax) {
          fail(`${lwhere}: pitfalls ${pitfalls.length} 条,要求 ${LIMITS.pitfallMin}-${LIMITS.pitfallMax}`)
        }
        bodyChars = validateSections(content.sections, ids, lwhere)
      }

      for (const id of ids) {
        if (courseAssigned.has(id)) {
          // checkpoint 会复用,普通课时不允许重复
          fail(`${lwhere}: 题目 ${id} 在本课程其它课时已出现`)
        }
        courseAssigned.add(id)
        assigned.add(id)
      }

      lessons.push({
        id: lessonSpec.id,
        title: lessonSpec.title,
        kind,
        content: {
          intro: (content.intro ?? '').trim(),
          ...(content.sections?.length ? { sections: content.sections } : {}),
          outline: content.outline ?? [],
          pitfalls: content.pitfalls ?? [],
        },
        questionIds: ids,
        // 阅读时间按 320 字/分钟估,加上每题 1.1 分钟的自评与回看
        estimatedMinutes: Math.max(
          5,
          Math.ceil(bodyChars / 320) + Math.round(ids.length * 1.1),
        ),
      })
      stagePrevIds.push(...ids)
    }

    if (!lessons.length) {
      fail(`${swhere}: 阶段没有课时`)
      continue
    }

    // 阶段验收的题必须来自本阶段
    const checkpointIds = buildCheckpoint(stagePrevIds, {
      ...stageSpec,
      lessons: lessons.map((l) => ({ questionIds: l.questionIds })),
    })
    const stageSet = new Set(stagePrevIds)
    for (const id of checkpointIds) {
      if (!stageSet.has(id)) fail(`${swhere}: 验收题 ${id} 不属于本阶段`)
    }

    stages.push({
      id: stageSpec.id,
      title: stageSpec.title,
      goal: stageSpec.goal,
      summary: stageSpec.summary,
      lessons,
      checkpoint: {
        questionIds: checkpointIds,
        passRatio: stageSpec.checkpoint?.passRatio ?? 0.8,
      },
    })
  }

  if (stages.length < LIMITS.stageMin || stages.length > LIMITS.stageMax) {
    fail(`${where}: ${stages.length} 个阶段,要求 ${LIMITS.stageMin}-${LIMITS.stageMax}`)
  }

  for (const item of spec.excluded ?? []) {
    if (!questionById.has(item.id)) fail(`${where}: excluded 中的「${item.id}」不存在`)
    if (courseAssigned.has(item.id)) fail(`${where}: excluded 中的「${item.id}」已被课程使用`)
    excludedAll.set(item.id, `${spec.id}: ${item.reason}`)
  }

  const allIds = stages.flatMap((s) => s.lessons.flatMap((l) => l.questionIds))
  const unique = new Set(allIds)
  const minutes = stages.reduce((sum, s) => sum + s.lessons.reduce((m, l) => m + l.estimatedMinutes, 0), 0)
  const firstLessonId = stages[0]?.lessons[0]?.id

  resolvedCourses.push({
    version: 1,
    id: spec.id,
    language: spec.language,
    title: spec.title,
    subtitle: spec.subtitle,
    level: spec.level ?? 'intro',
    prerequisites: spec.prerequisites ?? [],
    outcomes: spec.outcomes ?? [],
    order: spec.order ?? 0,
    firstLessonId,
    stageCount: stages.length,
    lessonCount: stages.reduce((n, s) => n + s.lessons.length, 0),
    uniqueQuestionCount: unique.size,
    estimatedMinutes: minutes,
    stages,
  })
}

// ---------- 覆盖率 ----------

const coverageByTopic = []
for (const topic of index.topics) {
  const questions = topicQuestions.get(topic.id) ?? []
  const unassigned = questions.filter((q) => !assigned.has(q.id) && !excludedAll.has(q.id))
  coverageByTopic.push({
    topicId: topic.id,
    title: topic.name,
    total: questions.length,
    assigned: questions.length - unassigned.length,
    unassignedIds: unassigned.map((q) => q.id),
  })
  if (unassigned.length && !PARTIAL) {
    fail(
      `覆盖率缺口 ${topic.id}: ${unassigned.length}/${questions.length} 题未进入任何课时 —— ${unassigned
        .slice(0, 6)
        .map((q) => q.id)
        .join(', ')}${unassigned.length > 6 ? ' …' : ''}`,
    )
  }
}

const totalQuestions = [...questionById.keys()].length
const covered = assigned.size

// ---------- 输出 ----------

if (problems.length) {
  console.error(`\n❌ 课程校验失败(${problems.length} 项):\n`)
  for (const p of problems) console.error('  • ' + p)
  console.error('')
  process.exit(1)
}

resolvedCourses.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

const payload = JSON.stringify(resolvedCourses)
const buildHash = crypto.createHash('sha1').update(payload).digest('hex').slice(0, 12)

const courseIndex = {
  version: 1,
  sourceIndexGeneratedAt: index.generatedAt,
  buildHash,
  courses: resolvedCourses.map((c) => ({
    id: c.id,
    language: c.language,
    title: c.title,
    subtitle: c.subtitle,
    level: c.level,
    prerequisites: c.prerequisites,
    outcomes: c.outcomes,
    order: c.order,
    firstLessonId: c.firstLessonId,
    stageCount: c.stageCount,
    lessonCount: c.lessonCount,
    uniqueQuestionCount: c.uniqueQuestionCount,
    estimatedMinutes: c.estimatedMinutes,
  })),
}

// ---------- 块索引与教学审计 ----------

/**
 * 块地址 = `课程/阶段/课时#s序号`(序号从 1 起,对应 sections 数组)。
 * 指纹让工具能判断「我看到的这个块还是不是当前这个块」,也给改块提供乐观并发。
 */
function buildBlockIndex(courses, buildHash) {
  const lessons = {}
  for (const course of courses) {
    for (const stage of course.stages) {
      for (const lesson of stage.lessons) {
        const key = `${course.id}/${stage.id}/${lesson.id}`
        const sections = lesson.content.sections ?? []
        lessons[key] = {
          hash: hashSections(sections),
          blocks: sections.map((block, i) => ({
            addr: `${key}#s${i + 1}`,
            kind: block.kind,
            hash: hashBlock(block),
          })),
        }
      }
    }
  }
  return { version: 1, buildHash, lessons }
}

function writeIfChanged(file, data) {
  const text = JSON.stringify(data, null, 2) + '\n'
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false
  fs.writeFileSync(file, text)
  return true
}

let written = 0
if (!CHECK_ONLY) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  if (writeIfChanged(path.join(OUT_DIR, 'index.json'), courseIndex)) written++
  if (writeIfChanged(BLOCK_INDEX_PATH, buildBlockIndex(resolvedCourses, buildHash))) written++

  const keep = new Set()
  for (const course of resolvedCourses) {
    keep.add(`${course.id}.json`)
    if (writeIfChanged(path.join(OUT_DIR, `${course.id}.json`), course)) written++
  }
  // 清理改名/下线课程的残留文件
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (file === 'index.json' || keep.has(file)) continue
    if (file.endsWith('.json')) fs.rmSync(path.join(OUT_DIR, file))
  }
}

const auditWarnings = auditCourses(resolvedCourses)
const auditSummary = summarizeAudit(auditWarnings)

const report = {
  sourceIndexGeneratedAt: index.generatedAt,
  buildHash,
  totals: {
    courses: resolvedCourses.length,
    stages: resolvedCourses.reduce((n, c) => n + c.stageCount, 0),
    lessons: resolvedCourses.reduce((n, c) => n + c.lessonCount, 0),
    uniqueQuestions: covered,
    totalQuestions,
  },
  byTopic: coverageByTopic,
  byCourse: resolvedCourses.map((c) => ({
    courseId: c.id,
    title: c.title,
    questions: c.uniqueQuestionCount,
    stages: c.stageCount,
    lessons: c.lessonCount,
    minutes: c.estimatedMinutes,
    excluded: [...excludedAll.entries()].filter(([, v]) => v.startsWith(c.id + ':')).map(([k]) => k),
  })),
  audit: { summary: auditSummary, warnings: auditWarnings },
}
if (!CHECK_ONLY) fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n')

// ---------- 控制台 ----------

console.log(`\n课程构建${CHECK_ONLY ? '(校验模式)' : ''}  buildHash=${buildHash}`)
console.log(
  `  课程 ${report.totals.courses} · 阶段 ${report.totals.stages} · 课时 ${report.totals.lessons} · 覆盖 ${covered}/${totalQuestions} 题`,
)
console.log('')

for (const course of resolvedCourses) {
  const flag = course.uniqueQuestionCount >= 100 ? '█' : course.uniqueQuestionCount >= 40 ? '▓' : '▒'
  console.log(
    `  ${flag} ${course.id.padEnd(28)} ${String(course.uniqueQuestionCount).padStart(4)} 题  ` +
      `${course.stageCount} 阶段  ${String(course.lessonCount).padStart(3)} 课时  ${course.estimatedMinutes} 分钟`,
  )
  if (VERBOSE) {
    for (const stage of course.stages) {
      console.log(`      · ${stage.title}(${stage.lessons.length} 课时 / 验收 ${stage.checkpoint.questionIds.length} 题)`)
      for (const lesson of stage.lessons) {
        const first = questionById.get(lesson.questionIds[0])
        const last = questionById.get(lesson.questionIds.at(-1))
        console.log(`        - ${lesson.id} [${lesson.questionIds.length}] ${lesson.title}`)
        console.log(`            首: ${first ? first.title.slice(0, 46) : '?'}`)
        console.log(`            末: ${last ? last.title.slice(0, 46) : '?'}`)
      }
    }
  }
}

const gaps = coverageByTopic.filter((t) => t.unassignedIds.length)
if (gaps.length && PARTIAL) {
  console.log('\n  尚未覆盖(分批写作中,忽略):')
  for (const t of gaps) console.log(`    ${t.topicId}  ${t.assigned}/${t.total}`)
}
if (auditWarnings.length) {
  console.log(
    `  教学审计 ${auditWarnings.length} 条警告(不阻断构建${SHOW_AUDIT ? '' : ',加 --audit 看明细'}):`,
  )
  for (const row of auditSummary) {
    console.log(`    ${row.rule.padEnd(19)} ${String(row.count).padStart(4)}`)
  }
  if (SHOW_AUDIT) {
    console.log('')
    for (const w of auditWarnings) console.log(`    - ${w.addr ?? w.where}: ${w.message}`)
  }
  console.log('')
}

console.log(
  `\n✓ 校验通过${CHECK_ONLY ? '（未写盘）' : written ? `,写入 ${written} 个文件` : ',内容无变化未重写'}\n`,
)
