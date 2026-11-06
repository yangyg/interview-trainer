/**
 * 答案 HTML 的解析层：所有题型生成器共用。
 *
 * 题库的 answerHtml 是 marked + highlight.js 的产物，结构规整
 * （p / ul / ol / pre / blockquote / table / h3），但正文里混着
 * <code> 与 <strong>，直接按标点切句会在 `a.b()` 的句点处切错。
 *
 * 做法：把行内 <code> 换成占位符（\u0001 内容 \u0002）后再切句，
 * 需要 HTML 时再还原。占位符在切句、长度统计、相似度里都被当作普通字符。
 */

const CODE_OPEN = '\u0001'
const CODE_CLOSE = '\u0002'

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

export function decodeEntities(input) {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    const hit = ENTITIES[body.toLowerCase()]
    return hit === undefined ? match : hit
  })
}

/** 去掉全部标签并解码实体，保留换行 */
export function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, ''))
}

/** 纯文本：去标签、压缩空白 */
export function textOf(html) {
  return stripTags(html).replace(/\s+/g, ' ').trim()
}

/** 行内 <code> 换成占位符，其余标签剥掉 */
export function toMarked(html) {
  const withMarks = html.replace(
    /<code\b[^>]*>([\s\S]*?)<\/code>/g,
    // 实体必须留到最后统一解码：过早把 &lt; 变成 <，下一步剥标签时会把它
    // 当成标签开头，连后面的正文一起吃掉（泛型、<pid>、&& 都会中招）。
    (_m, inner) => CODE_OPEN + inner.replace(/<[^>]+>/g, '') + CODE_CLOSE,
  )
  return decodeEntities(withMarks.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 占位符文本 -> HTML（转义后把占位符还原成 <code>） */
export function markedToHtml(marked) {
  const escaped = escapeHtml(marked)
  return escaped.replace(
    new RegExp(`${CODE_OPEN}([^${CODE_CLOSE}]*)${CODE_CLOSE}`, 'g'),
    (_m, inner) => `<code>${inner}</code>`,
  )
}

/** 占位符文本里的术语列表（按出现顺序，已去重） */
export function termsOfMarked(marked) {
  const out = []
  const re = new RegExp(`${CODE_OPEN}([^${CODE_CLOSE}]*)${CODE_CLOSE}`, 'g')
  let m
  while ((m = re.exec(marked)) !== null) {
    const term = m[1].trim()
    if (term && !out.includes(term)) out.push(term)
  }
  return out
}

/** 占位符文本 -> 纯文本（用于长度、相似度） */
export function plainOfMarked(marked) {
  return marked.split(CODE_OPEN).join('').split(CODE_CLOSE).join('')
}

/** 按中文句末标点切句，保留占位符 */
export function splitSentences(marked) {
  const out = []
  let buf = ''
  for (const ch of marked) {
    buf += ch
    if (ch === '。' || ch === '！' || ch === '？') {
      const s = buf.trim()
      if (s) out.push(s)
      buf = ''
    }
  }
  const rest = buf.trim()
  if (rest) out.push(rest)
  return out
}

const BLOCK_RE = /<(p|ul|ol|pre|blockquote|table|h2|h3|h4)\b[^>]*>([\s\S]*?)<\/\1>/g
const LI_RE = /<li\b[^>]*>([\s\S]*?)<\/li>/g

/**
 * @typedef {{ tag: string, html: string, marked: string, items: {marked: string, html: string}[] }} Block
 * @typedef {{ marked: string, plain: string, blockIndex: number, itemIndex: number }} Sentence
 */

/**
 * 把一题的 answerHtml 解析成块、句、代码块。
 * - blocks：顶层块（含 ul/ol 的 items）
 * - sentences：所有 p / li 里切出的句子，带所属块与条目下标
 * - pres：<pre> 的原始 HTML（代码输出题用）
 */
export function parseAnswer(html) {
  const source = html ?? ''
  const blocks = []
  const pres = []

  BLOCK_RE.lastIndex = 0
  let m
  while ((m = BLOCK_RE.exec(source)) !== null) {
    const tag = m[1]
    const inner = m[2]
    if (tag === 'pre') {
      pres.push(inner)
      continue
    }
    if (tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'table' || tag === 'blockquote') {
      continue
    }
    const items = []
    if (tag === 'ul' || tag === 'ol') {
      LI_RE.lastIndex = 0
      let li
      while ((li = LI_RE.exec(inner)) !== null) {
        const itemHtml = li[1]
        items.push({ html: itemHtml, marked: toMarked(itemHtml) })
      }
    }
    blocks.push({ tag, html: inner, marked: toMarked(inner), items })
  }

  const sentences = []
  blocks.forEach((block, blockIndex) => {
    const pushFrom = (marked, itemIndex) => {
      for (const s of splitSentences(marked)) {
        const plain = plainOfMarked(s)
        if (plain.length < 6) continue
        sentences.push({ marked: s, plain, blockIndex, itemIndex })
      }
    }
    if (block.items.length) {
      block.items.forEach((item, itemIndex) => pushFrom(item.marked, itemIndex))
    } else {
      pushFrom(block.marked, -1)
    }
  })

  return { blocks, sentences, pres }
}

export { CODE_OPEN, CODE_CLOSE }
