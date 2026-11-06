// 块指纹与教学审计。指纹给 course-tool 做寻址与乐观并发,审计把《规范》里
// 「值得修但不该阻断构建」的条款固化成警告,不再靠一次性脚本临时检查。
import crypto from 'node:crypto'

const fingerprint = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 12)

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) continue
      out[key] = sortValue(value[key])
    }
    return out
  }
  return value
}

/** 规范化 JSON:键排序、丢 undefined,保证同一内容不同书写顺序得到同一指纹 */
export const canonicalJson = (value) => JSON.stringify(sortValue(value))

export const hashBlock = (block) => fingerprint(canonicalJson(block))
export const hashSections = (sections) => fingerprint(canonicalJson(sections ?? []))

/** 审计规则说明。键即报告里的 rule 字段 */
export const AUDIT_RULES = {
  'code-version': '代码块缺少 version(规范 4.2:版本敏感的 API/默认值要注明版本)',
  'code-env': '代码块缺少 env(运行环境或数据规模,规范 8.2)',
  'code-verified': '代码块未标注 verified —— 跑过写 true,没跑写 false 明确标注',
  'analogy-limit': '类比缺少 limit(规范 4.3:像在哪里、不像在哪里)',
  'diagram-caption': '图示缺少 caption(这张图在讲什么机制)',
  'scale-schematic': '量级图未声明「示意」(规范 5.1:不可观测的数据要标明非实测)',
  'question-depth': '真题拆解缺少 depth(决定分档的细节)',
  'question-followup': '真题拆解缺少 followup(追问怎么接)',
  'stage-practice': '本阶段没有新场景练习(handwrite 或 explore,规范 6/8.1)',
  'course-explore': '课程没有 explore 发散块(规范第六章)',
  'process-no-diagram': '课时讲了过程/原因(principle / why),却没有过程类图示(flow / layers / state / sequence)',
  'long-body-no-structure': '单区块 3 段以上、180 字以上的纯文字,没有配图示 / 表格 / 要点 / 步骤',
  'text-run-no-anchor': '连续 3 个以上区块都是纯文字,中间没有图示 / 表格 / 要点 / 步骤等视觉锚点(图解化讲义规范)',
}

/** 能表现「时间往前走」的图示;其余是空间/分类快照 */
const PROCESS_DIAGRAMS = new Set(['flow', 'layers', 'state', 'sequence'])

/** 天然自带结构化承载的区块类型 */
const ANCHOR_KINDS = new Set(['diagram', 'compare', 'code', 'handwrite', 'question', 'explore'])

/**
 * 一个区块有没有「不用读大段文字也能懂」的视觉锚点。
 * 教学审计与图解化改造脚本共用同一口径，避免两边对「算不算结构化」给出不同答案。
 */
export function hasVisualAnchor(block) {
  return (
    ANCHOR_KINDS.has(block?.kind) ||
    !!block?.term ||
    !!block?.points?.length ||
    !!block?.steps?.length ||
    !!block?.mapping?.length ||
    !!block?.wrong?.length
  )
}

/**
 * 对已构建的课程做教学审计。只产出警告,不影响构建结果。
 * @returns {{rule: string, where: string, addr?: string, message: string}[]}
 */
export function auditCourses(courses) {
  const warnings = []
  const add = (rule, where, message, addr) =>
    warnings.push({ rule, where, ...(addr ? { addr } : {}), message })

  for (const course of courses) {
    let courseHasExplore = false

    for (const stage of course.stages) {
      let stageHasPractice = false

      for (const lesson of stage.lessons) {
        const where = `${course.id}/${stage.id}/${lesson.id}`
        const sections = lesson.content?.sections ?? []

        // 过程类内容最好有一张能按时间走的图;没有就提醒作者补,不阻断构建
        const hasProcessBlock = sections.some((b) => b.kind === 'principle' || b.kind === 'why')
        const hasProcessDiagram = sections.some(
          (b) => b.kind === 'diagram' && PROCESS_DIAGRAMS.has(b.diagram?.type),
        )
        if (hasProcessBlock && !hasProcessDiagram) {
          add('process-no-diagram', where, '讲了过程 / 原因却没有过程类图示')
        }

        // 图解化:不能让读者连着读三屏文字。连续 3 个无锚点区块只报一次,指出整段范围
        let run = 0
        let runStart = 0
        sections.forEach((block, i) => {
          if (hasVisualAnchor(block)) {
            run = 0
            return
          }
          if (run === 0) runStart = i + 1
          run += 1
          if (run === 3) {
            add(
              'text-run-no-anchor',
              where,
              `第 ${runStart}-${i + 1} 区块连续纯文字,中间没有图示 / 表格 / 要点 / 步骤`,
              `${where}#s${runStart}-s${i + 1}`,
            )
          }
        })

        sections.forEach((block, i) => {
          const addr = `${where}#s${i + 1}`

          // 长段落纯文字最难读:有 term / points / steps / mapping / 表格 / 图示就算有替代
          const body = Array.isArray(block.body) ? block.body : []
          if (body.length >= 3 && body.join('').length >= 180 && !hasVisualAnchor(block)) {
            add('long-body-no-structure', where, '大段纯文字没有配结构化表达', addr)
          }

          if (block.kind === 'handwrite' || block.kind === 'explore') stageHasPractice = true
          if (block.kind === 'explore') courseHasExplore = true

          if (block.kind === 'code') {
            if (!block.version) add('code-version', where, '代码块没有注明版本', addr)
            if (!block.env) add('code-env', where, '代码块没有注明运行环境', addr)
            // true / false 都是合法标注:true = 真跑过,false = 明确承认没跑。
            // 只有完全没写才告警 —— 逼作者表态,而不是逼作者撒谎。
            if (typeof block.verified !== 'boolean') {
              add('code-verified', where, '代码块没有 verified 标注', addr)
            }
          }

          if (block.kind === 'analogy' && !block.limit) {
            add('analogy-limit', where, '类比没有写适用边界', addr)
          }

          if (block.kind === 'diagram') {
            // 图示的说明文字写在 diagram.caption 里(LessonDiagram 只读这一处)
            const caption = String(block.diagram?.caption ?? block.caption ?? '')
            if (!caption) add('diagram-caption', where, '图示没有 caption', addr)
            if (block.diagram?.type === 'scale' && !/示意|非实测|非真实数据/.test(caption)) {
              add('scale-schematic', where, '量级图没有声明「示意」', addr)
            }
          }

          if (block.kind === 'question') {
            if (!block.depth) add('question-depth', where, `题目 ${block.questionId} 没有 depth`, addr)
            if (!block.followup) {
              add('question-followup', where, `题目 ${block.questionId} 没有 followup`, addr)
            }
          }
        })
      }

      if (!stageHasPractice) {
        add('stage-practice', `${course.id}/${stage.id}`, `「${stage.title}」没有新场景练习`)
      }
    }

    if (!courseHasExplore) {
      add('course-explore', course.id, `「${course.title}」没有 explore 发散块`)
    }
  }

  return warnings
}

/** 按规则聚合计数,供构建输出与报告使用(避免几百条警告刷屏) */
export function summarizeAudit(warnings) {
  const counts = {}
  for (const w of warnings) counts[w.rule] = (counts[w.rule] ?? 0) + 1
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => ({ rule, count, description: AUDIT_RULES[rule] ?? '' }))
}
