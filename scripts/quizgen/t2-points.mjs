/**
 * T2 要点多选：「以下哪些属于本题答案给出的要点？」
 *
 * 判的是「是否出自原文」，不是「是否绝对正确」——这个措辞能把
 * 「错项其实也对」的争议压到最小。错项必须来自同专题不同章节的题，
 * 并过四道隔离闸，任一不过就整题丢弃。
 */

import { markedToHtml, toMarked, textOf, plainOfMarked, escapeHtml } from './html.mjs'
import { dice, sharesNgram } from './corpus.mjs'
import { fnv1a, difficultyOf } from './t1-term.mjs'

const MAX_PER_QUESTION = 2
const MAX_POINT_LEN = 70
const MIN_POINT_LEN = 6

function seededShuffle(list, seed) {
  const out = [...list]
  let state = seed >>> 0
  for (let i = out.length - 1; i > 0; i--) {
    state = Math.imul(state ^ (state >>> 15), 0x2545f491) >>> 0
    const j = state % (i + 1)
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** 把一个 <li> 规整成 {label, body, bodyMarked, html, plainLen}，不合格返回 null */
export function pointOf(itemHtml, src) {
  const labelMatch = /^<strong>([\s\S]*?)<\/strong>\s*[：:]\s*/.exec(itemHtml.trim())
  const label = labelMatch ? textOf(labelMatch[1]).trim() : ''
  const rest = labelMatch ? itemHtml.trim().slice(labelMatch[0].length) : itemHtml
  const bodyMarked = toMarked(rest)
  const body = plainOfMarked(bodyMarked).trim()
  if (body.length < MIN_POINT_LEN || body.length > MAX_POINT_LEN) return null
  if (/^[<]/.test(bodyMarked)) return null
  const html = (label ? `<strong>${escapeHtml(label)}</strong>：` : '') + markedToHtml(bodyMarked)
  return { label, body, bodyMarked, html, len: body.length, ...src }
}

const KEYWORD_RE = /[A-Za-z_][A-Za-z0-9_.$#-]{2,}/g

function keywordsOf(title) {
  return new Set((title.match(KEYWORD_RE) ?? []).map((w) => w.toLowerCase()))
}

const ASCII_TOKEN = /[A-Za-z_][A-Za-z0-9_.$]{1,}/g

function sharesToken(a, b) {
  const left = new Set((a.match(ASCII_TOKEN) ?? []).map((w) => w.toLowerCase()))
  if (!left.size) return false
  for (const word of b.match(ASCII_TOKEN) ?? []) if (left.has(word.toLowerCase())) return true
  return false
}

/**
 * @param {object} q
 * @param {{blocks: {tag:string, items:{html:string}[]}[]}} parsed
 * @param {{srcId:string, topicId:string, chapter:string, srcNo:string, srcTitle:string, body:string, html:string, len:number}[]} pool 同语言全部要点
 * @param {(reason: string) => void} drop
 */
export function buildT2(q, parsed, pool, drop) {
  const items = []
  const fullText = parsed.sentences.map((s) => s.plain).join(' ')
  const keywords = keywordsOf(q.title)

  const blocks = parsed.blocks.filter(
    (b) => (b.tag === 'ul' || b.tag === 'ol') && b.items.length >= 3 && b.items.length <= 6,
  )

  for (const block of blocks) {
    if (items.length >= MAX_PER_QUESTION) break

    const points = block.items
      .map((item, index) => pointOf(item.html, { srcId: q.id, chapter: q.chapter, srcNo: q.no, srcTitle: q.title, index }))
      .filter(Boolean)
    // 3–4 项取 2 个正项；5–6 项取 3 个。要求「凑满原列表」会把 AI 专题整类丢掉
    const positiveCount = points.length >= 5 ? 3 : 2
    if (points.length < positiveCount) { drop('t2:points-too-few'); continue }
    // 有标签的条目更像「要点」，优先
    const ordered = [...points].sort((a, b) => Number(Boolean(b.label)) - Number(Boolean(a.label)))
    const positives = ordered.slice(0, positiveCount)
    const positiveTexts = positives.map((p) => p.body)
    const avgLen = positiveTexts.reduce((sum, t) => sum + t.length, 0) / positiveTexts.length

    const negatives = []
    const usedSrc = new Set([q.id])
    // 先在同专题的不同章节里找（区分度好，但最容易「其实也对」，所以加严）；
    // 凑不齐再跨专题（主题差异明显，不会两个都对）。
    const tiers = [
      { list: pool.filter((p) => p.topicId === q.topicId && p.chapter !== q.chapter), strict: true },
      { list: pool.filter((p) => p.topicId !== q.topicId), strict: false },
    ]
    for (const tier of tiers) {
      if (negatives.length >= 2) break
      for (const candidate of seededShuffle(tier.list, fnv1a(q.id + block.tag))) {
        if (negatives.length >= 2) break
        if (usedSrc.has(candidate.srcId)) continue
        const body = candidate.body
        if (sharesNgram(body, fullText, 5)) continue
        if ([...keywords].some((w) => body.toLowerCase().includes(w))) continue
        const ratio = body.length / avgLen
        if (ratio < 0.7 || ratio > 1.4) continue
        if (positiveTexts.some((p) => dice(p, body) >= 0.45)) continue
        if (tier.strict) {
          // 同专题里的「换个说法」最容易让两个选项都对：共享英文标识符或 3 字片段直接排除
          if (positiveTexts.some((p) => sharesToken(p, body) || sharesNgram(p, body, 3))) continue
        }
        if (negatives.some((n) => dice(n.body, body) >= 0.5 || sharesNgram(n.body, body, 4))) continue
        negatives.push(candidate)
        usedSrc.add(candidate.srcId)
      }
    }
    if (negatives.length < 2) { drop('t2:no-negative'); continue }

    const n = items.length + 1
    const itemId = `${q.id}:t2:${n}`
    const keys = ['A', 'B', 'C', 'D', 'E']

    const merged = seededShuffle(
      [
        ...positives.map((p) => ({ html: p.html, positive: true, from: q.no })),
        ...negatives.map((nd) => ({ html: nd.html, positive: false, from: nd.srcNo })),
      ],
      fnv1a(itemId),
    )
    const options = merged.map((option, i) => ({ key: keys[i], html: option.html }))
    const answerKeys = merged
      .map((option, i) => (option.positive ? keys[i] : null))
      .filter(Boolean)
      .sort()

    const explainHtml = [
      `<p><strong>本题答案的要点：</strong></p><ul>`,
      ...positives.map((p) => `<li>${p.html}</li>`),
      `</ul><p class="text-muted-foreground">另两条分别出自 ${negatives.map((nd) => `${nd.srcNo}（${escapeHtml(nd.srcTitle)}）`).join('、')}，不属于本题答案。</p>`,
    ].join('')

    items.push({
      id: itemId,
      type: 'T2',
      srcId: q.id,
      topicId: q.topicId,
      chapter: q.chapter,
      difficulty: difficultyOf(q),
      stemHtml: `<p class="tower-stem-title">关于「${escapeHtml(q.title)}」，以下哪些属于本题答案给出的要点？</p>`,
      explainHtml,
      options,
      answerKeys,
    })
  }

  return items
}
