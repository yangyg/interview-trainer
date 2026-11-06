// 图解化改造清单：读已构建的课程 JSON，按统一口径给每个课时打分并列出待改区块。
// 只读、不写盘、不阻断构建。锚点口径直接复用 audit.mjs 的 hasVisualAnchor()，
// 避免「审计说没问题、改造清单却说要改」这类两边打架。
//
// 用法见 README「图解化讲义改造(进行中)」；评分口径见 DESIGN.md「图解化讲义写作规范」。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasVisualAnchor } from './audit.mjs'

const COURSES_DIR = new URL('../../public/data/courses/', import.meta.url)
const PLAYABLE_DIAGRAMS = new Set(['flow', 'layers', 'state', 'sequence'])
const LONG_BODY_PARAGRAPHS = 3
const LONG_BODY_CHARS = 180
/** 正文短于这个字数的纯文字区块不单列，避免清单被一两句话的过渡段刷满 */
const PENDING_MIN_CHARS = 60

const ADVICE = {
  why: '拆成 code 现场数据 + wrong 错解 + real 真因 + without 反证;正文只留一句现象',
  concept: '拆成 term 术语卡 + points 要点,必要时补一张 flow / split 图;正文压成 1–2 段注解',
  principle: 'steps 已自动可播放;正文压成引导句,结论移到 takeaway',
  analogy: '保留 mapping 对照表、压缩 text,并补 limit 适用边界',
  compare: '把说明文字压进 note / caption,表格本身已经是主视图',
  question: '回答骨架放 points,拉开分档放 depth,追问放 followup',
  code: '关键行讲解放 notes[],版本 / 环境 / 验证状态补齐',
}

function bodyOf(block) {
  return Array.isArray(block.body) ? block.body : []
}
function bodyChars(block) {
  return bodyOf(block).join('').length
}
function adviceFor(block) {
  return ADVICE[block.kind] ?? '补一张图示 / 表格 / 要点 / 步骤,把正文压成注解'
}

/** 前端 timeline.ts 的 isPlayable() 在 Node 侧的等价判定 */
export function isPlayable(block) {
  if (block?.kind === 'principle') return (block.steps ?? []).length >= 2
  const d = block?.diagram
  if (block?.kind !== 'diagram' || !d || !PLAYABLE_DIAGRAMS.has(d.type)) return false
  const n =
    d.type === 'sequence'
      ? (d.messages ?? []).length
      : d.type === 'state'
        ? (d.states ?? []).length
        : (d.items ?? []).length
  return n >= 2
}

/**
 * 关联题库里「没有明确落点」的题号。
 *
 * 口径只取两个确定信号:有真题拆解块,或正文其它位置(图注 / 收口 / 要点)显式写了题号。
 * 不靠自然语言关键词去猜「有没有讲到」——那会把「Java 特点」和「特点」混为一谈,
 * 大量误报,反而没人看清单。作者补一个 question 块或标一次题号即可消除。
 */
export function questionGaps(lesson) {
  const content = lesson?.content ?? {}
  const sections = Array.isArray(content.sections) ? content.sections : []
  const anchored = new Set(
    sections.filter((b) => b?.kind === 'question' && b.questionId).map((b) => b.questionId),
  )
  // question 块自带的 questionId 不算「正文提到」,先剔掉再扫全文
  const text = JSON.stringify(content).replace(/"questionId"\s*:\s*"[^"]+"/g, '')
  return (lesson?.questionIds ?? []).filter((id) => !anchored.has(id) && !text.includes(id))
}

/** 最长连续「无视觉锚点」区块数。图解化要求它 < 3 */
export function longestTextRun(sections) {
  let run = 0
  let max = 0
  for (const block of sections) {
    run = hasVisualAnchor(block) ? 0 : run + 1
    if (run > max) max = run
  }
  return max
}

/**
 * 给一节课打分。0 分 = 已按图解化规范写完（样板课 lang-jvm 即 0 分）。
 * 分数只用于排序，不是质量评级；各权重都写在下面，方便后续调口径。
 */
export function scoreLesson(lesson, where = '') {
  const sections = lesson?.content?.sections ?? []
  const diagrams = sections.filter((b) => b.kind === 'diagram')
  const playable = sections.filter(isPlayable)
  const bodyTotal = sections.reduce((n, b) => n + bodyChars(b), 0)
  const maxRun = longestTextRun(sections)
  const missingQuestions = questionGaps(lesson)

  const longBlocks = []
  const pending = []
  sections.forEach((block, i) => {
    const paragraphs = bodyOf(block).length
    const chars = bodyChars(block)
    const addr = `${where}#s${i + 1}`
    if (
      paragraphs >= LONG_BODY_PARAGRAPHS &&
      chars >= LONG_BODY_CHARS &&
      !hasVisualAnchor(block)
    ) {
      longBlocks.push({ addr, slot: i + 1, kind: block.kind, title: block.title ?? '', chars, paragraphs })
    }
    if (!hasVisualAnchor(block) && chars >= PENDING_MIN_CHARS) {
      pending.push({
        addr,
        slot: i + 1,
        kind: block.kind,
        title: block.title ?? '',
        chars,
        paragraphs,
        advice: adviceFor(block),
      })
    }
  })

  // 故意不封顶:全站有大量课时都「哪儿都缺」,封顶会让它们并列 100、排序失去意义
  const score =
    longBlocks.length * 10 +
    Math.max(0, maxRun - 2) * 6 +
    Math.max(0, 2 - diagrams.length) * 8 +
    Math.max(0, 2 - playable.length) * 6 +
    Math.min(20, Math.round(Math.max(0, bodyTotal - 1200) / 100)) +
    missingQuestions.length * 2

  return {
    where,
    title: lesson?.title ?? '',
    score,
    sections: sections.length,
    diagrams: diagrams.length,
    playable: playable.length,
    bodyTotal,
    longBlocks: longBlocks.length,
    maxRun,
    pending,
    questionTotal: (lesson?.questionIds ?? []).length,
    missingQuestions,
    ready: score === 0,
  }
}

/** 从构建产物里收集全部课时 */
export function collectLessons(dir = COURSES_DIR) {
  const dirPath = fileURLToPath(dir)
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .sort()
  const out = []
  for (const file of files) {
    const course = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'))
    for (const stage of course.stages ?? []) {
      for (const lesson of stage.lessons ?? []) {
        out.push({
          courseId: course.id,
          stageId: stage.id,
          row: scoreLesson(lesson, `${course.id}/${stage.id}/${lesson.id}`),
        })
      }
    }
  }
  return out.sort(
    (a, b) =>
      b.row.score - a.row.score ||
      b.row.pending.length - a.row.pending.length ||
      b.row.missingQuestions.length - a.row.missingQuestions.length ||
      b.row.bodyTotal - a.row.bodyTotal ||
      a.row.where.localeCompare(b.row.where),
  )
}

function parseArgs(argv) {
  const opts = { top: Infinity, course: '', lesson: '', json: false, gaps: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') opts.json = true
    else if (a === '--gaps') opts.gaps = true
    else if (a === '--top') opts.top = Math.max(1, Number(argv[++i]) || 20)
    else if (a === '--course') opts.course = argv[++i] ?? ''
    else if (a === '--lesson') opts.lesson = argv[++i] ?? ''
  }
  return opts
}

function printDetail(row) {
  const r = row.row
  console.log(`\n=== ${r.where} · ${r.title} ===`)
  console.log(
    `分数 ${r.score}${r.ready ? ' · 已达标 ✓' : ''} | 区块 ${r.sections} · 图示 ${r.diagrams} · 可播放 ${r.playable} · 正文 ${r.bodyTotal} 字 · 长纯文字块 ${r.longBlocks} · 最长连读 ${r.maxRun}`,
  )
  const landed = r.questionTotal - r.missingQuestions.length
  console.log(`题目落点 ${landed}/${r.questionTotal}${r.missingQuestions.length ? ` · 缺: ${r.missingQuestions.join('、')}` : ' ✓'}`)
  if (r.missingQuestions.length) {
    console.log('  → 给这些题补一个 question 真题拆解块,或在图注 / 收口里标出题号;并确认知识点真的讲了')
  }
  if (!r.pending.length) {
    console.log('无待改区块 ✓')
    return
  }
  console.log(`待改区块 ${r.pending.length} 个:`)
  for (const b of r.pending) {
    console.log(`  ${b.addr}  ${b.kind}  「${b.title}」  ${b.chars} 字 / ${b.paragraphs} 段`)
    console.log(`    → ${b.advice}`)
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  let lessons = collectLessons()
  if (opts.course) lessons = lessons.filter((x) => x.courseId === opts.course)
  if (opts.lesson) lessons = lessons.filter((x) => x.row.where.endsWith(`/${opts.lesson}`))
  if (opts.gaps) lessons = lessons.filter((x) => x.row.missingQuestions.length)

  const ready = lessons.filter((x) => x.row.ready).length
  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          total: lessons.length,
          ready,
          pending: lessons.length - ready,
          lessons: lessons.slice(0, opts.top === Infinity ? undefined : opts.top),
        },
        null,
        2,
      ),
    )
    return
  }

  if (opts.lesson) {
    for (const row of lessons) printDetail(row)
    return
  }

  const withGaps = lessons.filter((x) => x.row.missingQuestions.length).length
  console.log(
    `图解化改造清单 · 共 ${lessons.length} 课 · 已达标 ${ready} · 待改造 ${lessons.length - ready} · 题目未落点 ${withGaps} 课`,
  )
  console.log('按分数降序(0 = 已达标);分数只用于排优先级,不是质量评级\n')
  console.log(' 分数  课时地址                                        区块  图示  播放  正文  长块  连读  缺题  待改')
  console.log(' ────  ──────────────────────────────────────────────  ────  ────  ────  ────  ────  ────  ────  ────')
  for (const { row: r } of lessons.slice(0, opts.top)) {
    console.log(
      ` ${String(r.score).padStart(4)}  ${r.where.padEnd(48).slice(0, 48)}  ${String(r.sections).padStart(4)}  ${String(r.diagrams).padStart(4)}  ${String(r.playable).padStart(4)}  ${String(r.bodyTotal).padStart(4)}  ${String(r.longBlocks).padStart(4)}  ${String(r.maxRun).padStart(4)}  ${String(r.missingQuestions.length).padStart(4)}  ${String(r.pending.length).padStart(4)}`,
    )
  }
  console.log('\n看某课明细:npm run courses:visual-plan -- --lesson <课时id>')
  console.log('只看题目缺口:npm run courses:visual-plan -- --gaps --top 20')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
