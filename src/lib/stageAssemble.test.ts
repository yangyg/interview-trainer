import { describe, expect, it } from 'vitest'
import { hasStageVisuals, stageLinks, type StageRect } from './stageAssemble'
import type { PrincipleStep } from './types'

const step = (title: string, visual?: boolean): PrincipleStep => ({
  title,
  detail: '详解',
  ...(visual
    ? { visual: { kind: 'file' as const, input: 'a', output: 'b' } }
    : {}),
})

/** 造一个 cols × rows 的规整网格，卡片 100×60，间距 x=20 / y=30 */
function grid(cols: number, rows: number, count = cols * rows): StageRect[] {
  const out: StageRect[] = []
  for (let i = 0; i < count; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    const left = c * 120
    const top = r * 90
    out.push({
      left,
      right: left + 100,
      top,
      bottom: top + 60,
      cx: left + 50,
      cy: top + 30,
    })
  }
  return out
}

describe('hasStageVisuals', () => {
  it('没写 visual 的老课时不启用第二种演示', () => {
    expect(hasStageVisuals(undefined)).toBe(false)
    expect(hasStageVisuals([step('a'), step('b')])).toBe(false)
  })

  it('少于 2 步不启用，连接没有意义', () => {
    expect(hasStageVisuals([step('a', true)])).toBe(false)
  })

  it('部分写不启用（构建期会先拦下）', () => {
    expect(hasStageVisuals([step('a', true), step('b'), step('c', true)])).toBe(false)
  })

  it('每一步都写了才启用', () => {
    expect(hasStageVisuals([step('a', true), step('b', true), step('c', true)])).toBe(true)
  })
})

describe('stageLinks', () => {
  it('空或单张卡片没有连线', () => {
    expect(stageLinks([])).toEqual([])
    expect(stageLinks(grid(1, 1))).toEqual([])
  })

  it('3 列 × 2 行：同行水平、行末折返一次、再水平', () => {
    const links = stageLinks(grid(3, 2))
    expect(links).toHaveLength(5)
    expect(links.map((l) => l.arrow.dir)).toEqual([
      'right', 'right', 'down', 'right', 'right',
    ])
    expect(links[0].d).toBe('M 100 30 H 120')
    expect(links[0].length).toBe(20)
    // 第一行末 (cx=290, bottom=60) → 第二行首 (cx=50, top=90)，折线走 midY=75
    expect(links[2].d).toBe('M 290 60 V 75 H 50 V 90')
    expect(links[2].length).toBe(15 + 240 + 15)
    expect(links[2].arrow).toEqual({ x: 50, y: 90, dir: 'down' })
  })

  it('窄屏 1 列：5 条全是竖直连线', () => {
    const links = stageLinks(grid(1, 6))
    expect(links).toHaveLength(5)
    for (const l of links) {
      expect(l.arrow.dir).toBe('down')
      expect(l.d).toMatch(/^M 50 \d+ V \d+$/)
      expect(l.length).toBe(30)
    }
  })

  it('单行 6 列：5 条全是水平连线', () => {
    const links = stageLinks(grid(6, 1))
    expect(links).toHaveLength(5)
    for (const l of links) {
      expect(l.arrow.dir).toBe('right')
      expect(l.length).toBe(20)
    }
  })

  it('所有路径长度都为正且箭头落点等于路径终点', () => {
    for (const layout of [grid(3, 2), grid(1, 6), grid(6, 1)]) {
      for (const l of stageLinks(layout)) {
        expect(l.length).toBeGreaterThan(0)
        expect(Number.isFinite(l.arrow.x)).toBe(true)
        expect(Number.isFinite(l.arrow.y)).toBe(true)
      }
    }
  })
})
