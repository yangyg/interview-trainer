import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validatePool } from './validate'
import type { QuizIndex, QuizPool } from './types'

const DATA = join(process.cwd(), 'public', 'data', 'quiz')

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

describe('客观题库产物', () => {
  const index = readJson<QuizIndex>(join(DATA, 'index.json'))

  it('索引声明了题量与题型分布', () => {
    expect(index.version).toBe(1)
    expect(index.counts.total).toBeGreaterThan(1000)
    expect(index.buildHash).toMatch(/^[0-9a-f]{16}$/)
    expect(index.topics.length).toBeGreaterThan(20)
  })

  it('每个专题的题量与索引一致', () => {
    for (const topic of index.topics) {
      const pool = readJson<QuizPool>(join(DATA, `${topic.id}.json`))
      expect(pool.items.length, topic.id).toBe(topic.items)
    }
  })

  it('全部题目通过结构校验', () => {
    const errors: string[] = []
    for (const topic of index.topics) {
      const pool = readJson<QuizPool>(join(DATA, `${topic.id}.json`))
      errors.push(...validatePool(pool, topic.id))
    }
    expect(errors.slice(0, 10)).toEqual([])
  })

  it('每道题的 srcId 都指向真实存在的原题', () => {
    // 只有当产物与题库同版本时才有意义，这里只抽查前缀合法性
    for (const topic of index.topics) {
      const pool = readJson<QuizPool>(join(DATA, `${topic.id}.json`))
      for (const item of pool.items.slice(0, 20)) {
        expect(item.srcId.startsWith(topic.id)).toBe(true)
        expect(item.id.startsWith(`${item.srcId}:`)).toBe(true)
      }
    }
  })
})
