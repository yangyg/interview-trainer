/**
 * 「分解 → 连接」演示的纯逻辑层。
 *
 * 它与 stepPlayer.ts 是两种不同种类的演示：
 * - 步进播放：一个游标沿线性事件流走，同一份列表按 past/current/future 高亮。
 * - 拼装演示：N 个空间上彼此独立的阶段卡片，先各自可见，再按 i→i+1 逐段
 *   画出链路，最后让一枚令牌沿链扫过。这里没有事件流、没有倍速、没有 rAF 虚拟时钟。
 *
 * 组件负责测量 DOM 得到 StageRect，本文件只做与 DOM 无关的判定与几何计算，
 * 因此可以直接单测，也能在窄屏 / 宽屏切换时复用同一套路径规则。
 */

import type { PrincipleStep } from './types'

/** 与 types.ts 的 StageVisual.kind、build-courses.mjs 的 STAGE_VISUAL_KINDS 三处同步 */
export const STAGE_VISUAL_KINDS = [
  'file',
  'command',
  'pipeline',
  'interpreter',
  'counter',
  'chip',
] as const

/** 只有每一步都写了微图才启用第二种演示；部分写会被构建期拦下，这里再兜一层 */
export function hasStageVisuals(steps: readonly PrincipleStep[] | undefined): boolean {
  return !!steps && steps.length >= 2 && steps.every((s) => !!s?.visual)
}

/** 卡片相对画布左上角的矩形（px） */
export interface StageRect {
  left: number
  right: number
  top: number
  bottom: number
  cx: number
  cy: number
}

export type ArrowDir = 'right' | 'down'

export interface StageLink {
  /** SVG path 的 d；三种形态：同行水平 / 同列竖直 / 跨行折返 */
  d: string
  /** 折线长度近似值，供 stroke-dasharray + dashoffset 做逐段绘出 */
  length: number
  /** 箭头尖端的落点与朝向 */
  arrow: { x: number; y: number; dir: ArrowDir }
}

/** 同一行判定容差：卡片高度不同造成的 cx/cy 偏差不该被当成换行 */
const SAME_ROW_EPS = 8
const SAME_COL_EPS = 8

function line(x1: number, y1: number, x2: number, y2: number, dir: ArrowDir): StageLink {
  const horizontal = dir === 'right'
  return {
    d: horizontal ? `M ${x1} ${y1} H ${x2}` : `M ${x1} ${y1} V ${y2}`,
    length: horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1),
    arrow: { x: x2, y: y2, dir },
  }
}

/**
 * 相邻两张卡片之间的连线。
 * - 同行（桌面 3 列网格里的 1→2、2→3）：右边缘 → 左边缘，水平箭头。
 * - 同列（窄屏 1 列）：下边缘 → 上边缘，竖直箭头。
 * - 跨行折返（桌面第一行末 → 第二行首）：先下到两行之间的空隙，
 *   横向走到目标列，再向下进卡片上边缘。折线始终走在卡片之间的 gap 里，
 *   不会压住任何一张卡片。
 */
export function stageLinks(rects: readonly StageRect[]): StageLink[] {
  const out: StageLink[] = []
  for (let i = 0; i < rects.length - 1; i++) {
    const a = rects[i]
    const b = rects[i + 1]
    if (Math.abs(a.cy - b.cy) <= SAME_ROW_EPS && b.left >= a.right) {
      out.push(line(a.right, a.cy, b.left, b.cy, 'right'))
    } else if (Math.abs(a.cx - b.cx) <= SAME_COL_EPS) {
      out.push(line(a.cx, a.bottom, b.cx, b.top, 'down'))
    } else {
      const midY = (a.bottom + b.top) / 2
      const x1 = a.cx
      const x2 = b.cx
      const y1 = a.bottom
      const y2 = b.top
      out.push({
        d: `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`,
        length: Math.abs(midY - y1) + Math.abs(x2 - x1) + Math.abs(y2 - midY),
        arrow: { x: x2, y: y2, dir: 'down' },
      })
    }
  }
  return out
}
