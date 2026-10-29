import { describe, expect, it } from 'vitest'
import {
  applyEdit,
  parseAddr,
  planInsert,
  planRemove,
  planReplace,
  serialize,
} from './block-edit.mjs'

const evalLiteral = (text) => Function(`return (${text})`)()

const fixture = `export default {
  id: 'demo',
  stages: [
    {
      id: 'st',
      lessons: [
        {
          id: 'l',
          content: {
            intro: 'x',
            sections: [
              {
                kind: 'concept',
                title: 'A',
                body: [
                  'a1',
                ],
              },
              {
                kind: 'concept',
                title: 'B',
                body: [
                  'b1',
                ],
              },
            ],
          },
        },
      ],
    },
  ],
}
`

const sectionsOf = (source) => {
  const lesson = evalLiteral(
    source
      .replace('export default ', '')
      .trim(),
  )
  return lesson.stages[0].lessons[0].content.sections
}

const blockB = { kind: 'concept', title: 'B', body: ['b1'] }

describe('地址', () => {
  it('解析序号为 1 起的 slot', () => {
    expect(parseAddr('demo/st/l#s3')).toMatchObject({ courseId: 'demo', stageId: 'st', lessonId: 'l', slot: 3, index: 2 })
  })

  it('拒绝不合规地址', () => {
    expect(() => parseAddr('demo/st/l')).toThrow()
    expect(() => parseAddr('demo/st/l#s0')).toThrow()
  })
})

describe('序列化', () => {
  it('能重新求值回原对象', () => {
    const block = {
      kind: 'diagram',
      title: '图',
      body: ['一段'],
      diagram: {
        type: 'layers',
        items: [{ label: '页', note: '16KB', tone: 'warn' }],
        caption: '说明',
      },
    }
    expect(evalLiteral(serialize(block, ''))).toEqual(block)
  })

  it('对象全是标量时写一行,数组写多行', () => {
    expect(serialize({ a: 1, b: 'x' })).toBe("{ a: 1, b: 'x' }")
    expect(serialize(['x', 'y'])).toBe("[\n  'x',\n  'y',\n]")
  })

  it('转义单引号、反斜杠与换行', () => {
    const text = serialize({ a: "it's \\ ok\nnext" })
    expect(evalLiteral(text)).toEqual({ a: "it's \\ ok\nnext" })
  })

  it('拒绝 NaN', () => {
    expect(() => serialize({ n: NaN })).toThrow()
  })
})

describe('替换', () => {
  it('只改动目标区块,其余字节不变', () => {
    const next = { kind: 'concept', title: 'B2', body: ['b2', 'b3'], term: { name: 'T', def: 'D' } }
    const edit = planReplace(fixture, 'demo/st/l#s2', next)
    const edited = applyEdit(fixture, edit)
    expect(sectionsOf(edited)[1]).toEqual(next)
    expect(sectionsOf(edited)[0]).toEqual({ kind: 'concept', title: 'A', body: ['a1'] })
    expect(edited.slice(0, edit.start)).toBe(fixture.slice(0, edit.start))
    expect(edited.slice(edit.start + edit.text.length)).toBe(fixture.slice(edit.end))
  })

  it('越界时报错', () => {
    expect(() => planReplace(fixture, 'demo/st/l#s9', blockB)).toThrow(/越界/)
  })
})

describe('插入与删除', () => {
  const blockC = { kind: 'why', title: 'C', body: ['c1'] }

  it('在锚点之后插入', () => {
    const edited = applyEdit(fixture, planInsert(fixture, 'demo/st/l#s1', blockC, 'after'))
    const sections = sectionsOf(edited)
    expect(sections.map((s) => s.title)).toEqual(['A', 'C', 'B'])
  })

  it('在最后一个区块之后插入(无尾逗号也不出错)', () => {
    const edited = applyEdit(fixture, planInsert(fixture, 'demo/st/l#s2', blockC, 'after'))
    expect(sectionsOf(edited).map((s) => s.title)).toEqual(['A', 'B', 'C'])
  })

  it('在锚点之前插入', () => {
    const edited = applyEdit(fixture, planInsert(fixture, 'demo/st/l#s2', blockC, 'before'))
    expect(sectionsOf(edited).map((s) => s.title)).toEqual(['A', 'C', 'B'])
  })

  it('删除首、中、尾三个位置都保持顺序', () => {
    const three = applyEdit(fixture, planInsert(fixture, 'demo/st/l#s2', blockC, 'after'))
    expect(sectionsOf(applyEdit(three, planRemove(three, 'demo/st/l#s1'))).map((s) => s.title)).toEqual([
      'B',
      'C',
    ])
    expect(sectionsOf(applyEdit(three, planRemove(three, 'demo/st/l#s2'))).map((s) => s.title)).toEqual([
      'A',
      'C',
    ])
    expect(sectionsOf(applyEdit(three, planRemove(three, 'demo/st/l#s3'))).map((s) => s.title)).toEqual([
      'A',
      'B',
    ])
  })
})
