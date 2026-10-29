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

        sections.forEach((block, i) => {
          const addr = `${where}#s${i + 1}`

          if (block.kind === 'handwrite' || block.kind === 'explore') stageHasPractice = true
          if (block.kind === 'explore') courseHasExplore = true

          if (block.kind === 'code') {
            if (!block.version) add('code-version', where, '代码块没有注明版本', addr)
            if (!block.env) add('code-env', where, '代码块没有注明运行环境', addr)
            if (block.verified !== true) {
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
