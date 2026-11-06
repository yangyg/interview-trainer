/**
 * 确定性随机：同一 seed 永远得到同一张地图与同一批题，
 * 这样刷新页面不会「重 roll」，也让 bug 可复现。
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 字符串 -> 32 位整数（FNV-1a），用来从 id 派生 seed */
export function hashString(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** 加权不放回抽样；权重 <= 0 的项不会被选中 */
export function pickWeighted<T>(list: readonly T[], weightOf: (item: T) => number, count: number, rand: () => number): T[] {
  const pool = list.map((item) => ({ item, weight: Math.max(0, weightOf(item)) }))
  const out: T[] = []
  while (out.length < count && pool.length) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
    if (total <= 0) break
    let ticket = rand() * total
    let index = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      ticket -= pool[i].weight
      if (ticket <= 0) {
        index = i
        break
      }
    }
    out.push(pool[index].item)
    pool.splice(index, 1)
  }
  return out
}
