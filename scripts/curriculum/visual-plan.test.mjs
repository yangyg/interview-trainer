import { describe, expect, it } from 'vitest'
import { isPlayable, longestTextRun, questionGaps, scoreLesson } from './visual-plan.mjs'

const lesson = (sections) => ({ id: 'l', title: '课时', content: { sections } })

/** 样板课 lang-jvm 的结构形状：每个区块都有锚点 */
const visualFirst = () => [
  { kind: 'why', title: 't', body: ['一句现象'], wrong: ['一条错解'] },
  { kind: 'diagram', title: 't', diagram: { type: 'scale', items: [{ label: 'a', value: 1, display: '1' }] } },
  { kind: 'analogy', title: 't', mapping: [{ real: 'a', tech: 'b' }] },
  { kind: 'concept', title: 't', body: ['短注解'], points: ['一条要点'] },
  {
    kind: 'diagram',
    title: 't',
    diagram: { type: 'flow', items: [{ label: 'a' }, { label: 'b' }] },
  },
  { kind: 'principle', title: 't', steps: [{ title: 'a' }, { title: 'b' }] },
]

const longText = (i) => ({
  kind: 'concept',
  title: `纯文字 ${i}`,
  body: ['字'.repeat(70), '字'.repeat(70), '字'.repeat(70)],
})

describe('图解化改造清单', () => {
  it('每个区块都有锚点的图解化课时得 0 分、无待改区块', () => {
    const r = scoreLesson(lesson(visualFirst()), 'c/st/l')
    expect(r.score).toBe(0)
    expect(r.ready).toBe(true)
    expect(r.pending).toHaveLength(0)
    expect(r.longBlocks).toBe(0)
    expect(r.maxRun).toBe(0)
    expect(r.diagrams).toBe(2)
    expect(r.playable).toBe(2) // flow + principle.steps
  })

  it('大段纯文字、无图、无可播放演示会被列出并给出改写建议', () => {
    const r = scoreLesson(lesson([longText(1), longText(2), longText(3)]), 'c/st/l')
    expect(r.score).toBeGreaterThan(0)
    expect(r.ready).toBe(false)
    expect(r.longBlocks).toBe(3)
    expect(r.maxRun).toBe(3)
    expect(r.pending).toHaveLength(3)
    expect(r.pending[0].addr).toBe('c/st/l#s1')
    expect(r.pending[0].advice).toContain('term')
    expect(r.diagrams).toBe(0)
    expect(r.playable).toBe(0)
  })

  it('中间插一张图就断开连续文字段', () => {
    const sections = [
      longText(1),
      longText(2),
      { kind: 'diagram', title: 't', diagram: { type: 'layers', items: [{ label: 'a' }] } },
      longText(3),
    ]
    expect(longestTextRun(sections)).toBe(2)
    expect(scoreLesson(lesson(sections)).maxRun).toBe(2)
  })

  it('短过渡段不进待改清单，但仍算无锚点连读', () => {
    const sections = [
      { kind: 'concept', title: 't', body: ['一句话'] },
      longText(2),
      { kind: 'concept', title: 't', body: ['一句话'] },
    ]
    const r = scoreLesson(lesson(sections))
    expect(r.pending).toHaveLength(1)
    expect(r.maxRun).toBe(3)
  })

  it('isPlayable 只认有先后顺序且有内容的图示与 principle.steps', () => {
    expect(isPlayable({ kind: 'diagram', diagram: { type: 'flow', items: [{ label: 'a' }, { label: 'b' }] } })).toBe(true)
    expect(isPlayable({ kind: 'diagram', diagram: { type: 'flow', items: [{ label: 'a' }] } })).toBe(false)
    expect(isPlayable({ kind: 'diagram', diagram: { type: 'memory', regions: [] } })).toBe(false)
    expect(isPlayable({ kind: 'diagram', diagram: { type: 'contain', items: [{ label: 'a' }, { label: 'b' }] } })).toBe(false)
    expect(isPlayable({ kind: 'diagram', diagram: { type: 'layers', items: [{ label: 'a' }, { label: 'b' }] } })).toBe(true)
    expect(isPlayable({ kind: 'diagram', diagram: { type: 'state', states: ['a', 'b'] } })).toBe(true)
    expect(isPlayable({ kind: 'principle', steps: [{ title: 'a' }, { title: 'b' }] })).toBe(true)
    expect(isPlayable({ kind: 'principle', steps: [{ title: 'a' }] })).toBe(false)
  })

  it('分数不封顶：待改区块越多越靠前，全站排序才有区分度', () => {
    const few = scoreLesson(lesson([longText(1), longText(2)]))
    const many = scoreLesson(lesson(Array.from({ length: 30 }, (_, i) => longText(i))))
    expect(many.score).toBeGreaterThan(few.score)
    expect(few.score).toBeGreaterThan(0)
  })
})

describe('题目落点检查', () => {
  const withQuestions = (sections) => ({
    id: 'l',
    title: '课时',
    questionIds: ['java-01-Q1', 'java-01-Q2', 'java-01-Q3'],
    content: { sections },
  })

  it('真题拆解块与正文题号都算落点，其余报缺', () => {
    const l = withQuestions([
      { kind: 'question', title: 't', questionId: 'java-01-Q1', points: ['a', 'b'] },
      { kind: 'concept', title: 't', points: ['自查 java-01-Q2 看这张图'] },
    ])
    expect(questionGaps(l)).toEqual(['java-01-Q3'])
  })

  it('question 块自带的 questionId 不会被误当成正文提及', () => {
    const l = withQuestions([
      { kind: 'question', title: 't', questionId: 'java-01-Q1', points: ['a', 'b'] },
    ])
    expect(questionGaps(l)).toEqual(['java-01-Q2', 'java-01-Q3'])
  })

  it('图注 / 收口 / intro 里写题号也算落点，不强制每课都堆 question 块', () => {
    const l = withQuestions([{ kind: 'compare', title: 't', head: ['题号'], rows: [['java-01-Q1']] }])
    l.content.outline = ['关联 java-01-Q2']
    l.content.intro = 'java-01-Q3 见边界图'
    expect(questionGaps(l)).toEqual([])
  })

  it('缺口计入优先级分数，且不影响「图解化已达标」的既有判定', () => {
    const clean = withQuestions(visualFirst())
    clean.questionIds = []
    expect(scoreLesson(clean).score).toBe(0)
    const gapped = withQuestions(visualFirst())
    const r = scoreLesson(gapped)
    expect(r.missingQuestions).toHaveLength(3)
    expect(r.questionTotal).toBe(3)
    expect(r.score).toBe(6)
    expect(r.ready).toBe(false)
  })

  it('没有 questionIds 的老课时不报缺口', () => {
    expect(questionGaps(lesson(visualFirst()))).toEqual([])
  })
})
