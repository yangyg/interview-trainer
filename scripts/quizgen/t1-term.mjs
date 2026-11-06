/**
 * T1 术语单选（挖空）。
 *
 * 题干必须以原题 title 开头，否则玩家不知道在考什么，只能猜原文用词。
 * 干扰项来自同语言术语池，且必须与正确项同形态、同量级、不撞本题。
 * 挑不满 3 个干扰项就整题丢弃——宁缺毋滥。
 */

import { markedToHtml, plainOfMarked, termsOfMarked, escapeHtml, CODE_OPEN, CODE_CLOSE } from './html.mjs'
import { pickDistractors, isUsableTerm } from './corpus.mjs'

const BLANK = '\u0003'
const MAX_PER_QUESTION = 2
const MIN_STRIPPED_LEN = 12

export function fnv1a(text) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function difficultyOf(q) {
  const d = q.difficulty
  if (!d) return 2
  if (d <= 2) return 1
  if (d >= 4) return 3
  return 2
}

function blankSentence(marked, term) {
  const replaced = marked.replace(`${CODE_OPEN}${term}${CODE_CLOSE}`, BLANK)
  return markedToHtml(replaced).replace(BLANK, '<span class="blank">____</span>')
}

/**
 * @param {object} q 原题
 * @param {{sentences: {marked:string, plain:string, blockIndex:number, itemIndex:number}[]}} parsed
 * @param {ReturnType<import('./corpus.mjs').buildCorpus>} corpus
 * @param {(reason: string) => void} drop
 */
export function buildT1(q, parsed, corpus, drop) {
  const items = []
  const fullPlain = parsed.sentences.map((s) => s.plain).join(' ')

  /** 本题出现过的全部术语：既不能当干扰项，也用来做出现次数判定 */
  const candidates = []
  for (const sentence of parsed.sentences) {
    for (const term of termsOfMarked(sentence.marked)) {
      if (!isUsableTerm(term)) continue
      if (candidates.includes(term)) continue
      candidates.push(term)
    }
  }
  if (!candidates.length) return items

  const excludeTerms = new Set(candidates)

  for (const term of candidates) {
    if (items.length >= MAX_PER_QUESTION) break

    const occurrences = fullPlain.split(term).length - 1
    if (occurrences !== 1) { drop('t1:term-repeats'); continue }
    if (q.title.includes(term)) { drop('t1:term-in-title'); continue }

    const index = parsed.sentences.findIndex((s) => s.plain.includes(term))
    if (index < 0) { drop('t1:term-not-in-sentence'); continue }
    const sentence = parsed.sentences[index]

    if (plainOfMarked(sentence.marked).split(term).length - 1 !== 1) { drop('t1:ambiguous-blank'); continue }
    if (termsOfMarked(sentence.marked).length > 3) { drop('t1:dense-code'); continue }
    if (plainOfMarked(sentence.marked).replace(term, '').length < MIN_STRIPPED_LEN) { drop('t1:stem-too-short'); continue }

    const stemText = plainOfMarked(sentence.marked)
    const distractors = pickDistractors(term, corpus, {
      lang: q.language,
      topicId: q.topicId,
      chapter: q.chapter,
      excludeTerms,
      stemText,
      need: 3,
    })
    if (distractors.length < 3) { drop('t1:no-distractor'); continue }

    const n = items.length + 1
    const itemId = `${q.id}:t1:${n}`
    const keys = ['A', 'B', 'C', 'D']

    const correctIndex = fnv1a(itemId) % 4
    const rest = distractors.map((text) => ({ html: `<code>${escapeHtml(text)}</code>`, from: 'corpus' }))
    rest.splice(correctIndex, 0, { html: `<code>${escapeHtml(term)}</code>` })
    const options = rest.map((option, i) => ({ key: keys[i], ...option }))

    // 上一句做语境前缀：让挖空句读起来有上下文，而不是凭空一句
    const prev = parsed.sentences[index - 1]
    const useContext = prev
      && prev.blockIndex === sentence.blockIndex
      && prev.itemIndex === sentence.itemIndex
      && prev.plain.length <= 80
    const contextHtml = useContext
      ? `<p class="tower-stem-context"><span class="text-muted-foreground">${markedToHtml(prev.marked)}</span></p>`
      : ''

    const stemHtml = [
      `<p class="tower-stem-title">${escapeHtml(q.title)}</p>`,
      contextHtml,
      `<p class="tower-stem-body">${blankSentence(sentence.marked, term)}</p>`,
    ].join('')

    const next = parsed.sentences[index + 1]
    const explainExtra = next && next.blockIndex === sentence.blockIndex && next.itemIndex === sentence.itemIndex
      && sentence.plain.length + next.plain.length <= 160
      ? ' ' + markedToHtml(next.marked)
      : ''

    items.push({
      id: itemId,
      type: 'T1',
      srcId: q.id,
      topicId: q.topicId,
      chapter: q.chapter,
      difficulty: difficultyOf(q),
      stemHtml,
      explainHtml: `<p>${markedToHtml(sentence.marked)}${explainExtra}</p>`,
      options,
      answerKey: keys[correctIndex],
    })
  }

  return items
}
