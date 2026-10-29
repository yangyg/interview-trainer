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

  it('汇总按条数降序', () => {
    const summary = summarizeAudit([
      { rule: 'code-env' },
      { rule: 'course-explore' },
      { rule: 'code-env' },
    ])
    expect(summary[0]).toMatchObject({ rule: 'code-env', count: 2 })
  })
})
