/**
 * 全库语料索引：术语池 + 干扰项筛选工具。
 *
 * 术语池的用途只有一个——给挖空题找「同领域、同形态、长度相近、
 * 又不会撞答案」的干扰项。因此每条都要带语言/专题/章节，供加权。
 */

import { termsOfMarked, parseAnswer, plainOfMarked, CODE_OPEN, CODE_CLOSE } from './html.mjs'

/** 字符二元组 Dice 相似度，0 = 完全不同，1 = 完全相同 */
export function dice(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1
  const grams = (s) => {
    const out = new Map()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      out.set(g, (out.get(g) ?? 0) + 1)
    }
    return out
  }
  const ga = grams(a)
  const gb = grams(b)
  let hit = 0
  for (const [g, n] of ga) {
    const other = gb.get(g)
    if (other) hit += Math.min(n, other)
  }
  const total = (a.length - 1) + (b.length - 1)
  return total > 0 ? (2 * hit) / total : 0
}

/** 取 n-gram 集合（用于「不与本题共享 5-gram」这类硬隔离） */
export function ngrams(text, n) {
  const out = new Set()
  const clean = text.replace(/\s+/g, '')
  for (let i = 0; i + n <= clean.length; i++) out.add(clean.slice(i, i + n))
  return out
}

export function sharesNgram(a, b, n = 5) {
  const small = a.length <= b.length ? a : b
  const big = a.length <= b.length ? b : a
  if (small.length < n) return small.length > 0 && big.includes(small)
  const set = ngrams(big, n)
  for (const g of ngrams(small, n)) if (set.has(g)) return true
  return false
}

/** 形态分类：干扰项要和正确项同形态，否则「唯一像代码的那个」就是答案 */
export function shapeOf(term) {
  const hasAscii = /[A-Za-z]/.test(term)
  const hasCjk = /[\u4e00-\u9fa5]/.test(term)
  if (hasAscii && hasCjk) return 'mixed'
  if (hasAscii) return 'ascii'
  if (hasCjk) return 'cjk'
  return 'other'
}

const TERM_BLACKLIST = new Set([
  'null', 'true', 'false', 'undefined', 'nil', '0', '1', '-1', 'void',
  'this', 'self', 'new', 'return', 'if', 'else', 'for', 'while',
])

export function isUsableTerm(term) {
  const t = term.trim()
  if (t.length < 2 || t.length > 24) return false
  if (TERM_BLACKLIST.has(t.toLowerCase())) return false
  // 纯标点 / 纯数字 / 纯空白
  if (!/[A-Za-z\u4e00-\u9fa5]/.test(t)) return false
  // 整句调用（含括号且很长）不适合挖空
  if (t.length > 16 && /[(){}[\]]/.test(t)) return false
  return true
}

/**
 * 遍历全部专题，建立：
 * - terms：术语 -> { text, lang, topicIds:Set, chapters:Set, srcIds:Set, df }
 * - byLang：语言 -> 术语数组（抽样用）
 */
export function buildCorpus(topicDocs) {
  /** @type {Map<string, {text:string, lang:string, topicIds:Set<string>, chapters:Set<string>, srcIds:Set<string>, df:number}>} */
  const terms = new Map()

  for (const { topic, questions } of topicDocs) {
    for (const q of questions) {
      const parsed = parseAnswer(q.answerHtml)
      const seen = new Set()
      for (const sentence of parsed.sentences) {
        for (const term of termsOfMarked(sentence.marked)) {
          if (!isUsableTerm(term)) continue
          let entry = terms.get(term)
          if (!entry) {
            entry = { text: term, lang: q.language, langs: new Set(), topicIds: new Set(), chapters: new Set(), srcIds: new Set(), df: 0 }
            terms.set(term, entry)
          }
          entry.langs.add(q.language)
          if (seen.has(term)) continue
          seen.add(term)
          entry.topicIds.add(q.topicId)
          entry.chapters.add(`${q.topicId}/${q.chapter}`)
          entry.srcIds.add(q.id)
          entry.df += 1
        }
      }
    }
  }

  const byLang = new Map()
  for (const entry of terms.values()) {
    if (!byLang.has(entry.lang)) byLang.set(entry.lang, [])
    byLang.get(entry.lang).push(entry)
  }

  return { terms, byLang }
}

/**
 * 给挖空题挑干扰项。
 * 返回 [] 表示挑不满，调用方应丢弃该题（宁缺毋滥）。
 *
 * @param {string} correct 正确项文本
 * @param {ReturnType<buildCorpus>} corpus
 * @param {{ lang:string, topicId:string, chapter:string, excludeTerms:Set<string>, stemText:string, need:number }} ctx
 *   excludeTerms = 本题答案里出现过的全部术语 ∪ 题干里出现过的术语（都不能当干扰项）
 */
export function pickDistractors(correct, corpus, ctx) {
  const correctShape = shapeOf(correct)
  const correctLen = correct.length
  const correctHasParen = /[()]/.test(correct)
  const pool = corpus.byLang.get(ctx.lang) ?? []
  const chapterKey = `${ctx.topicId}/${ctx.chapter}`

  // 只从同章节 / 同专题里取。跨专题的术语与正确项毫无语义关系，
  // 会造出「只有一个像代码」的假题（实测 `.class` 配 `INCR`/`cmpxchg`）。
  const near = []
  const sameTopicOtherChapter = []
  for (const entry of pool) {
    const t = entry.text
    if (t === correct) continue
    // 硬隔离：本题答案里出现过的术语不能当干扰项（那等于「两个都对」）
    if (ctx.excludeTerms?.has(t)) continue
    if (ctx.stemText.includes(t)) continue
    if (!entry.langs.has(ctx.lang)) continue
    if (shapeOf(t) !== correctShape) continue
    if (/[()]/.test(t) !== correctHasParen) continue
    const ratio = t.length / correctLen
    if (ratio < 0.6 || ratio > 1.6) continue
    if (dice(t, correct) >= 0.55) continue // 太像 = 两个都对
    if (entry.chapters.has(chapterKey)) near.push(entry)
    else if (entry.topicIds.has(ctx.topicId)) sameTopicOtherChapter.push(entry)
  }

  const picked = []
  for (const tier of [near, sameTopicOtherChapter]) {
    if (picked.length >= ctx.need) break
    // 高频术语更可能是「这个领域的人都会想到的错答案」，比随机术语更像干扰项
    const sorted = [...tier].sort((a, b) => b.df - a.df || a.text.localeCompare(b.text))
    // 只在靠前的窗口里均匀取样：既不等同于「固定取最高频」，也不会取到冷僻词
    const window = sorted.slice(0, Math.max(ctx.need * 4, ctx.need))
    const step = Math.max(1, Math.floor(window.length / (ctx.need - picked.length + 1)))
    for (let i = 0; i < window.length && picked.length < ctx.need; i += step) {
      const t = window[i].text
      if (picked.includes(t)) continue
      if (picked.some((other) => dice(other, t) >= 0.5)) continue
      picked.push(t)
    }
    for (const entry of window) {
      if (picked.length >= ctx.need) break
      if (picked.includes(entry.text)) continue
      if (picked.some((other) => dice(other, entry.text) >= 0.5)) continue
      picked.push(entry.text)
    }
  }

  return picked.length >= ctx.need ? picked : []
}

export { CODE_OPEN, CODE_CLOSE, plainOfMarked }
