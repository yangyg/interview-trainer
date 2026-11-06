import { describe, expect, it } from 'vitest'
import { auditCourses, canonicalJson, hashBlock, hashSections, summarizeAudit } from './audit.mjs'

const lesson = (id, sections) => ({ id, title: id, content: { sections } })
const course = (id, stages) => ({ id, title: id, stages })

describe('块指纹', () => {
  it('键顺序不影响指纹', () => {
    expect(hashBlock({ kind: 'concept', title: 'a', body: ['x'] })).toBe(
      hashBlock({ body: ['x'], title: 'a', kind: 'concept' }),
    )
  })

  it('内容变化会改变指纹', () => {
    expect(hashBlock({ kind: 'concept', body: ['x'] })).not.toBe(
      hashBlock({ kind: 'concept', body: ['y'] }),
    )
  })

  it('规范化时丢弃 undefined', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}')
  })

  it('空 sections 也有稳定指纹', () => {
    expect(hashSections()).toBe(hashSections([]))
  })
})

describe('教学审计', () => {
  it('阶段没有练习、课程没有 explore 时各报一条', () => {
    const warnings = auditCourses([
      course('c', [
        { id: 'st', title: '阶段', lessons: [lesson('l', [{ kind: 'concept', title: 't', body: ['x'] }])] },
      ]),
    ])
    const rules = warnings.map((w) => w.rule)
    expect(rules).toContain('stage-practice')
    expect(rules).toContain('course-explore')
  })

  it('explore 同时消解阶段与课程两条警告', () => {
    const warnings = auditCourses([
      course('c', [
        { id: 'st', title: '阶段', lessons: [lesson('l', [{ kind: 'explore', title: 't' }])] },
      ]),
    ])
    expect(warnings.map((w) => w.rule)).not.toContain('stage-practice')
    expect(warnings.map((w) => w.rule)).not.toContain('course-explore')
  })

  it('量级图读 diagram.caption,声明示意后不再报', () => {
    const scale = (caption) =>
      auditCourses([
        course('c', [
          {
            id: 'st',
            title: '阶段',
            lessons: [
              lesson('l', [
                { kind: 'explore', title: 't' },
                { kind: 'diagram', title: 't', diagram: { type: 'scale', items: [], caption } },
              ]),
            ],
          },
        ]),
      ]).filter((w) => w.rule === 'scale-schematic')

    expect(scale('耗时对比')).toHaveLength(1)
    expect(scale('耗时对比(示意:数量级,非实测)')).toHaveLength(0)
  })

  it('代码块缺少 version/env/verified 时各报一条', () => {
    const warnings = auditCourses([
      course('c', [
        {
          id: 'st',
          title: '阶段',
          lessons: [
            lesson('l', [{ kind: 'explore', title: 't' }, { kind: 'code', title: 't', lang: 'java', code: 'x' }]),
          ],
        },
      ]),
    ])
    const rules = warnings.map((w) => w.rule)
    expect(rules).toContain('code-version')
    expect(rules).toContain('code-env')
    expect(rules).toContain('code-verified')
    expect(warnings.find((w) => w.rule === 'code-version').addr).toBe('c/st/l#s2')
  })

  it('讲了过程却没有过程类图示时报 process-no-diagram，补一张 flow 即消解', () => {
    const audit = (extra) =>
      auditCourses([
        course('c', [
          {
            id: 'st',
            title: '阶段',
            lessons: [
              lesson('l', [
                { kind: 'explore', title: 't' },
                { kind: 'principle', title: 't', steps: [{ title: 'a', detail: 'b' }, { title: 'c', detail: 'd' }] },
                ...extra,
              ]),
            ],
          },
        ]),
      ]).filter((w) => w.rule === 'process-no-diagram')

    expect(audit([])).toHaveLength(1)
    expect(audit([{ kind: 'diagram', title: 't', diagram: { type: 'flow', items: [{ label: 'a' }] } }])).toHaveLength(0)
    // 空间类快照不算过程图
    expect(audit([{ kind: 'diagram', title: 't', diagram: { type: 'matrix', cols: ['a'], rows: [[]] } }])).toHaveLength(1)
  })

  it('3 段 180 字以上纯文字报 long-body-no-structure，配了要点就不报', () => {
    const body = ['字'.repeat(70), '字'.repeat(70), '字'.repeat(70)]
    const audit = (block) =>
      auditCourses([
        course('c', [{ id: 'st', title: '阶段', lessons: [lesson('l', [{ kind: 'explore', title: 't' }, block])] }]),
      ]).filter((w) => w.rule === 'long-body-no-structure')

    expect(audit({ kind: 'concept', title: 't', body })).toHaveLength(1)
    expect(audit({ kind: 'concept', title: 't', body, points: ['一条要点'] })).toHaveLength(0)
    expect(audit({ kind: 'concept', title: 't', body: body.slice(0, 2) })).toHaveLength(0)
  })

  it('连续 3 个纯文字区块报 text-run-no-anchor，中间插一张图或有要点就消解', () => {
    const plain = (i) => ({ kind: 'concept', title: `t${i}`, body: ['一段说明'] })
    const audit = (sections) =>
      auditCourses([
        course('c', [{ id: 'st', title: '阶段', lessons: [lesson('l', sections)] }]),
      ]).filter((w) => w.rule === 'text-run-no-anchor')

    const hit = audit([plain(1), plain(2), plain(3)])
    expect(hit).toHaveLength(1)
    expect(hit[0].addr).toBe('c/st/l#s1-s3')
    expect(
      audit([
        plain(1),
        plain(2),
        { kind: 'diagram', title: 't', diagram: { type: 'flow', items: [{ label: 'a' }] } },
        plain(3),
      ]),
    ).toHaveLength(0)
    expect(audit([plain(1), { ...plain(2), points: ['一条要点'] }, plain(3)])).toHaveLength(0)
  })

  it('图解化后的 lang-jvm 式结构不报 text-run-no-anchor', () => {
    const sections = [
      { kind: 'why', title: 't', body: ['短现象'], wrong: ['一条错解'] },
      { kind: 'diagram', title: 't', diagram: { type: 'scale', items: [] } },
      { kind: 'analogy', title: 't', mapping: [{ real: 'a', tech: 'b' }] },
      { kind: 'concept', title: 't', body: ['短注解'], points: ['一条要点'] },
      { kind: 'principle', title: 't', steps: [{ title: 'a' }] },
    ]
    const warnings = auditCourses([
      course('c', [{ id: 'st', title: '阶段', lessons: [lesson('l', sections)] }]),
    ]).filter((w) => w.rule === 'text-run-no-anchor')
    expect(warnings).toHaveLength(0)
  })

  it('汇总按条数降序', () => {
    const summary = summarizeAudit([
      { rule: 'code-env' },
      { rule: 'course-explore' },
      { rule: 'code-env' },
    ])
    expect(summary[0]).toMatchObject({ rule: 'code-env', count: 2 })
  })
})
