import { describe, expect, it } from 'vitest'
import { buildPlan, filterPlan, renderPlanSummary, renderPlanText, renderPrompt } from './plan.mjs'

const spec = {
  id: 'demo',
  title: '演示课',
  stages: [
    {
      id: 'st',
      title: '阶段',
      lessons: [
        {
          id: 'l1',
          title: '课时一',
          content: {
            sections: [
              { kind: 'concept', title: '是什么', body: ['x'] },
              { kind: 'principle', title: '怎么运作', steps: [] },
              { kind: 'question', title: 'Q1', questionId: 't-1', points: ['a', 'b'] },
              { kind: 'diagram', title: '图', diagram: { type: 'flow', items: [{ label: 'a' }], caption: '示意' } },
            ],
          },
        },
      ],
    },
  ],
}

const courseData = { stages: [{ id: 'st', lessons: [{ id: 'l1', questionIds: ['t-1', 't-2'] }] }] }
const questions = new Map([
  ['t-1', { id: 't-1', title: '题一', chapter: '章', frequency: 3, difficulty: 2 }],
  ['t-2', { id: 't-2', title: '题二', chapter: '章', frequency: 2, difficulty: 1 }],
])

const makePlan = () => buildPlan({ spec, courseData, questions })

describe('计划', () => {
  it('没有练习与 explore 时各出一个动作,explore 排在前', () => {
    const plan = makePlan()
    expect(plan.actions.map((a) => a.type)).toEqual(['explore', 'practice'])
    expect(plan.actions[0].lesson).toBe('demo/st/l1')
    expect(plan.actions[0].anchor).toEqual({ addr: 'demo/st/l1#s4', hash: expect.stringMatching(/^[0-9a-f]{12}$/) })
  })

  it('未拆解真题只进缺口,不变成动作', () => {
    const plan = makePlan()
    const lesson = plan.lessons[0]
    expect(lesson.uncovered).toEqual(['t-2'])
    expect(lesson.gaps.map((g) => g.rule)).toContain('uncovered-question')
    expect(plan.actions.map((a) => a.type)).not.toContain('question')
  })

  it('已有 explore 和练习后不再出动作', () => {
    const withPractice = {
      ...spec,
      stages: [
        {
          ...spec.stages[0],
          lessons: [
            {
              id: 'l1',
              title: '课时一',
              content: {
                sections: [...spec.stages[0].lessons[0].content.sections, { kind: 'explore', title: '延伸' }],
              },
            },
          ],
        },
      ],
    }
    const plan = buildPlan({ spec: withPractice, courseData, questions })
    expect(plan.actions).toEqual([])
    expect(plan.course.hasExplore).toBe(true)
  })

  it('filterPlan 能缩到阶段与课时', () => {
    const plan = makePlan()
    expect(filterPlan(plan, { stageId: 'st' }).lessons).toHaveLength(1)
    expect(() => filterPlan(plan, { stageId: 'nope' })).toThrow()
    expect(() => filterPlan(plan, { stageId: 'st', lessonId: 'nope' })).toThrow()
  })

  it('摘要与文本视图包含待办数', () => {
    const plan = makePlan()
    expect(renderPlanSummary(plan)).toContain('待办 2')
    expect(renderPlanText(plan)).toContain('动作:')
  })
})

describe('容量', () => {
  const sections = (n) =>
    Array.from({ length: n }, (_, i) => ({ kind: 'concept', title: `c${i}`, body: ['x'] }))
  const courseWith = (a, b) => ({
    id: 'cap',
    title: '容量课',
    stages: [
      {
        id: 'st',
        title: '阶段',
        lessons: [
          { id: 'full', title: '满课', content: { sections: sections(a) } },
          { id: 'room', title: '有余量', content: { sections: sections(b) } },
        ],
      },
    ],
  })
  const data = {
    stages: [{ id: 'st', lessons: [{ id: 'full', questionIds: [] }, { id: 'room', questionIds: [] }] }],
  }
  const planFor = (a, b) => buildPlan({ spec: courseWith(a, b), courseData: data, questions: new Map() })

  it('优先选还有余量的课时', () => {
    const plan = planFor(20, 4)
    const explore = plan.actions.find((a) => a.type === 'explore')
    expect(explore.lesson).toBe('cap/st/room')
    expect(explore.blocked).toBeUndefined()
  })

  it('全部满员时标出 blocked,而不是给出无法执行的插入命令', () => {
    const plan = planFor(20, 20)
    const explore = plan.actions.find((a) => a.type === 'explore')
    expect(explore.blocked).toMatch(/上限/)
  })
})

describe('填充提示词', () => {
  it('explore 提示词包含六问约束与可执行的写入命令', () => {
    const plan = makePlan()
    const text = renderPrompt(plan, 'demo/st/l1', 'explore')
    expect(text).toContain('direction 只能取')
    expect(text).toContain('demo/st/l1#s4')
    expect(text).toContain('--expect')
    expect(text).toContain('题二')
  })

  it('按动作类型取提示词,没有动作时返回 null', () => {
    const plan = makePlan()
    expect(renderPrompt(plan, 'demo/st/l1', 'practice')).toContain('handwrite')
    expect(renderPrompt(plan, 'demo/st/l1', 'metadata')).toBeNull()
  })
})
