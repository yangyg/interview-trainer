// 两段式成稿的第一段:给每节课算出「还缺什么」,把缺口翻成可执行动作,
// 再把单块填充所需的上下文组装成提示词。第二段由作者(或 AI)按提示写一个 JSON,
// 交给 course-tool patch / insert 写入,写入后照常走构建校验。
import { auditCourses, hashBlock } from './audit.mjs'
import { EXPLORE_BRANCH_MAX, EXPLORE_DIRECTIONS, LIMITS } from './schema.mjs'

const REQUIRED_KINDS = ['concept', 'principle', 'question']
const CONCRETE_KINDS = ['analogy', 'diagram', 'compare']
const PRACTICE_KINDS = ['handwrite', 'explore']

/** 动作优先级:先写发散块,再补练习,最后处理机械元数据 */
const ACTION_ORDER = { explore: 0, practice: 1, metadata: 2 }

function lessonKey(courseId, stageId, lessonId) {
  return `${courseId}/${stageId}/${lessonId}`
}

/**
 * @param {{spec: object, courseData: object, questions: Map<string, object>}} input
 * courseData 是 public/data/courses/<id>.json,提供每节课实际挂的 questionIds
 */
export function buildPlan({ spec, courseData, questions }) {
  const generated = new Map()
  for (const stage of courseData.stages ?? []) {
    for (const lesson of stage.lessons ?? []) {
      generated.set(lessonKey(spec.id, stage.id, lesson.id), lesson)
    }
  }

  const lessons = []
  const stages = []
  let courseHasExplore = false

  for (const stage of spec.stages ?? []) {
    const stageLessons = []
    let stageHasPractice = false

    for (const lesson of stage.lessons ?? []) {
      const key = lessonKey(spec.id, stage.id, lesson.id)
      const sections = lesson.content?.sections ?? []
      const query = generated.get(key)

      const blocks = sections.map((block, i) => ({
        addr: `${key}#s${i + 1}`,
        slot: i + 1,
        kind: block.kind,
        hash: hashBlock(block),
        title: block.title ?? '',
      }))
      if (sections.some((b) => PRACTICE_KINDS.includes(b.kind))) stageHasPractice = true
      if (sections.some((b) => b.kind === 'explore')) courseHasExplore = true

      const covered = new Set(sections.filter((b) => b.kind === 'question').map((b) => b.questionId))
      const questionIds = query?.questionIds ?? []
      const questionList = questionIds.map((id) => {
        const q = questions.get(id)
        return {
          id,
          title: q?.title ?? '(题目不存在)',
          chapter: q?.chapter ?? '',
          frequency: q?.frequency ?? 0,
          difficulty: q?.difficulty ?? 0,
          covered: covered.has(id),
        }
      })

      const gaps = []
      const kinds = new Set(sections.map((b) => b.kind))
      if (!sections.length) {
        gaps.push({ rule: 'no-sections', message: '没有讲义 sections,仍是旧课时' })
      } else {
        for (const kind of REQUIRED_KINDS) {
          if (!kinds.has(kind)) gaps.push({ rule: 'missing-kind', message: `缺少 ${kind} 区块` })
        }
        if (!CONCRETE_KINDS.some((k) => kinds.has(k))) {
          gaps.push({ rule: 'missing-concrete', message: '缺少让抽象变具体的手段(analogy / diagram / compare)' })
        }
      }
      const uncovered = questionList.filter((q) => !q.covered).map((q) => q.id)
      // 题库存量题不是都要拆解:构建只要求每节课至少一块真题拆解。
      // 缺口写进 gaps 供作者挑重点,但不自动变成动作,否则会凭空造出几百块内容债。
      if (uncovered.length) {
        gaps.push({
          rule: 'uncovered-question',
          message: `${uncovered.length} 道题没有拆解块(可选深化):${uncovered.join(', ')}`,
        })
      }

      const audit = []
      stageLessons.push({
        key,
        title: lesson.title,
        stageId: stage.id,
        stageTitle: stage.title,
        blocks,
        questions: questionList,
        uncovered,
        gaps,
        audit,
      })
    }

    stages.push({ id: stage.id, title: stage.title, lessons: stageLessons.map((l) => l.key), hasPractice: stageHasPractice })
    lessons.push(...stageLessons)
  }

  // 课时级审计警告(带上地址,便于直接定位到块)
  for (const warning of auditCourseSections(spec)) {
    const addr = warning.addr
    if (!addr) continue
    const owner = lessons.find((l) => addr.startsWith(`${l.key}#`))
    if (owner) owner.audit.push({ rule: warning.rule, addr, message: warning.message })
  }

  const actions = []
  const hasRoom = (lesson) => lesson.blocks.length < LIMITS.sectionMax
  const pickTarget = (candidates) => candidates.filter(hasRoom).at(-1) ?? candidates.at(-1)

  for (const stage of stages) {
    if (stage.hasPractice) continue
    const target = pickTarget(lessons.filter((l) => stage.lessons.includes(l.key)))
    if (target) actions.push(makeAction('practice', target, 'handwrite', `阶段「${stage.title}」没有新场景练习`))
  }
  if (!courseHasExplore && lessons.length) {
    const target = pickTarget(lessons)
    actions.push(makeAction('explore', target, 'explore', `课程「${spec.title}」没有 explore 发散块`))
  }
  for (const lesson of lessons) {
    const metaRules = [...new Set(lesson.audit.filter((a) => a.rule.startsWith('code-')).map((a) => a.rule))]
    if (metaRules.length) {
      actions.push({
        type: 'metadata',
        lesson: lesson.key,
        kind: 'code',
        rules: metaRules,
        anchor: lastBlock(lesson),
        reason: `代码块元数据待补:${metaRules.join(', ')}`,
      })
    }
  }
  actions.sort((a, b) => ACTION_ORDER[a.type] - ACTION_ORDER[b.type])

  return {
    course: {
      id: spec.id,
      title: spec.title,
      lessons: lessons.length,
      blocks: lessons.reduce((n, l) => n + l.blocks.length, 0),
      hasExplore: courseHasExplore,
    },
    stages,
    lessons,
    actions,
  }
}

function lastBlock(lesson) {
  const block = lesson.blocks.at(-1)
  return block ? { addr: block.addr, hash: block.hash } : null
}

function makeAction(type, lesson, kind, reason) {
  const action = { type, lesson: lesson.key, kind, anchor: lastBlock(lesson), reason }
  if (lesson.blocks.length >= LIMITS.sectionMax) {
    action.blocked = `课时已有 ${LIMITS.sectionMax} 个区块,达到上限,需先合并或替换`
  }
  return action
}

/** 复用构建期的审计规则,喂给它一份只含本课程作者源内容的视图 */
function auditCourseSections(spec) {
  const view = {
    id: spec.id,
    title: spec.title,
    stages: (spec.stages ?? []).map((stage) => ({
      id: stage.id,
      title: stage.title,
      lessons: (stage.lessons ?? []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        content: { sections: lesson.content?.sections ?? [] },
      })),
    })),
  }
  return auditCourses([view])
}

/** 只保留指定阶段 / 课时,便于 plan 命令缩小范围 */
export function filterPlan(plan, { stageId, lessonId } = {}) {
  if (!stageId) return plan
  const stages = plan.stages.filter((s) => s.id === stageId)
  if (!stages.length) throw new Error(`课程「${plan.course.id}」里没有阶段「${stageId}」`)
  const keys = lessonId
    ? stages[0].lessons.filter((key) => key === `${plan.course.id}/${stageId}/${lessonId}`)
    : stages[0].lessons
  if (lessonId && !keys.length) throw new Error(`阶段「${stageId}」里没有课时「${lessonId}」`)
  return {
    ...plan,
    stages: stages.map((s) => ({ ...s, lessons: keys })),
    lessons: plan.lessons.filter((l) => keys.includes(l.key)),
    actions: plan.actions.filter((a) => keys.includes(a.lesson)),
  }
}

/** 一行摘要,用于一次看全部课程 */
export function renderPlanSummary(plan) {
  const byType = {}
  for (const action of plan.actions) byType[action.type] = (byType[action.type] ?? 0) + 1
  const detail = Object.entries(byType).map(([type, n]) => `${type} ${n}`).join(' · ') || '无待办'
  return (
    `${plan.course.id.padEnd(26)} ${String(plan.course.lessons).padStart(3)} 课时  ` +
    `${String(plan.course.blocks).padStart(4)} 区块  待办 ${plan.actions.length}(${detail})`
  )
}

/** 文本视图:课程 → 阶段 → 课时 → 动作 */
export function renderPlanText(plan) {
  const lines = []
  const uncovered = plan.lessons.reduce((n, l) => n + l.uncovered.length, 0)
  lines.push(
    `${plan.course.id}  ${plan.course.lessons} 课时 / ${plan.course.blocks} 区块  ` +
      `待办 ${plan.actions.length} 项` +
      (plan.course.hasExplore ? '' : ' · 无 explore') +
      (uncovered ? ` · ${uncovered} 题未拆解(可选深化)` : ''),
  )

  for (const stage of plan.stages) {
    lines.push('')
    lines.push(`  ${stage.id}  ${stage.title}${stage.hasPractice ? '' : '  (无练习)'}`)
    for (const key of stage.lessons) {
      const lesson = plan.lessons.find((l) => l.key === key)
      const actions = plan.actions.filter((a) => a.lesson === key)
      const flag = actions.length ? `→ ${actions.map((a) => a.kind).join('/')}` : '✓'
      lines.push(`    ${lesson.title}  [${lesson.blocks.length} 区块]  ${flag}`)
    }
  }

  if (plan.actions.length) {
    lines.push('')
    lines.push('  动作:')
    for (const action of plan.actions) {
      const anchor = action.anchor ? ` 锚点 ${action.anchor.addr} @${action.anchor.hash}` : ''
      const blocked = action.blocked ? `  ⚠ ${action.blocked}` : ''
      lines.push(`    · ${action.type} ${action.lesson}${anchor} —— ${action.reason}${blocked}`)
    }
  }
  return lines.join('\n')
}

const KIND_SPECS = {
  explore: {
    purpose: '从一个知识点建立知识网络:向下、横向、跨领域、向外或反向,任选有解释价值的方向',
    fields: [
      ['title', '结论先行的一句话标题'],
      ['from', '当前知识:刚学的是什么,为什么值得往外延伸(一句,不许空)'],
      [
        'branches',
        `1-${EXPLORE_BRANCH_MAX} 个分支,每个必须写全 direction / related / basis / shared / diff / value 六项`,
      ],
    ],
    rules: [
      `direction 只能取 ${[...EXPLORE_DIRECTIONS.keys()].join(' / ')}`,
      '六问缺一不可:关联什么、凭什么关联、哪里相同、哪里不能混为一谈、理解了有什么新认识',
      '只写有机制联系的分支;只列技术名词或学习路线的不写',
    ],
  },
  handwrite: {
    purpose: '手撕题:让读者先自己写,再看参考实现',
    fields: [
      ['title', '题目名'],
      ['lang', 'java / go / sql / python'],
      ['prompt', '面试官会怎么问'],
      ['signature', '方法签名'],
      ['plan', '≥2 步思路,每步 { title, detail }'],
      ['skeleton', '骨架,必须至少留一个 TODO'],
      ['solution', '参考实现,必须可运行'],
      ['complexity', '时间 / 空间复杂度'],
      ['traps', '现场容易写错的地方'],
    ],
    rules: ['骨架不能是答案;参考实现与思路步骤必须一致'],
  },
  code: {
    purpose: '代码片段 + 关键行讲解',
    fields: [
      ['title', '这段代码证明什么'],
      ['lang', '语言'],
      ['code', '代码字符串(不是对象)'],
      ['version', '版本,如 JDK 21 / MySQL 8.0'],
      ['env', '运行环境或数据规模'],
      ['verified', '跑过写 true,没跑写 false'],
      ['notes', '关键行讲解'],
    ],
    rules: ['没实际运行就写 verified: false,不许默认 true'],
  },
}

/** 单块填充提示词。找不到动作时返回 null */
export function renderPrompt(plan, key, actionType) {
  const lesson = plan.lessons.find((l) => l.key === key)
  if (!lesson) throw new Error(`计划里没有课时「${key}」`)
  const actions = plan.actions.filter((a) => a.lesson === key)
  const action = actionType ? actions.find((a) => a.type === actionType) : actions[0]
  if (!action) return null

  const kind = action.kind
  const spec = KIND_SPECS[kind]
  const stage = plan.stages.find((s) => s.id === lesson.stageId)

  const lines = []
  lines.push(`为课时「${lesson.title}」写一个 ${kind} 区块。`)
  lines.push('')
  lines.push('## 上下文')
  lines.push(`- 课程:${plan.course.title}(${plan.course.id})`)
  lines.push(`- 阶段:${stage?.title ?? lesson.stageTitle}(${lesson.stageId})`)
  lines.push(`- 课时:${lesson.title}(${lesson.key})`)
  lines.push(`- 缺口:${action.reason}`)
  lines.push(`- 已有区块:${lesson.blocks.map((b) => `${b.slot}.${b.kind}《${b.title}》`).join(' → ')}`)

  if (lesson.questions.length) {
    lines.push('')
    lines.push('## 本节关联真题')
    for (const q of lesson.questions) {
      lines.push(
        `- ${q.id} ${q.title}(频率 ${q.frequency} / 难度 ${q.difficulty},章节:${q.chapter || '未知'})`,
      )
    }
  }

  lines.push('')
  lines.push(`## 要写的区块:${kind}`)
  lines.push(spec.purpose)
  lines.push('字段(只能出现这些,拼错字段名会让内容在页面上静默消失):')
  for (const [name, note] of spec.fields) lines.push(`- ${name}:${note}`)
  for (const rule of spec.rules) lines.push(`- 约束:${rule}`)

  lines.push('')
  lines.push('## 教学要求')
  lines.push('- 结论先行:标题和第一段先把答案说清楚,再展开机制')
  lines.push('- 讲清「为什么需要它、没有它会怎样」,不要只罗列 API')
  lines.push('- 讲边界与代价:何时不适用、失效条件、替代方案')
  lines.push('- 不虚构数字、版本与实测结果;不确定的写「待验证」并说明验证方法')
  lines.push('- 与已有区块不重复:先看上面「已有区块」的标题,别把讲过的东西再讲一遍')

  lines.push('')
  lines.push('## 输出与写入')
  lines.push('只输出一个 JSON 对象(不要解释,不要代码围栏),保存为 block.json 后执行:')
  const anchor = action.anchor
  if (action.blocked) {
    lines.push(`- ${action.blocked};先用 show 看该课时结构,合并同主题区块腾出位置再 insert`)
  } else if (action.type === 'metadata') {
    lines.push('- 这是既有区块的元数据补全:用 `npm run course -- show <地址> --json` 取块,补 version / env / verified 后 patch')
  } else if (anchor) {
    lines.push(
      `- npm run course -- insert ${anchor.addr} --from block.json --expect ${anchor.hash}`,
    )
    lines.push(`- 插入位置在该课时最后一个区块之后;插入后请重新 \`npm run course -- list <课时>\` 核对序号`)
  } else {
    lines.push('- 该课时还没有区块,先用 patch 的目标课时手工建 content.sections')
  }

  return lines.join('\n')
}
