import MiniSearch from 'minisearch'
import type { Question } from './types'

/** CJK 按二元组分词,拉丁词整词小写——让中文可前缀/模糊检索 */
export function cjkTokenizer(text: string): string[] {
  const tokens: string[] = []
  for (const m of text.matchAll(/[a-zA-Z0-9]+|[\u3400-\u9fff]+/g)) {
    const seg = m[0]
    if (/^[a-zA-Z0-9]+$/.test(seg)) {
      tokens.push(seg.toLowerCase())
      continue
    }
    if (seg.length === 1) {
      tokens.push(seg)
      continue
    }
    for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2))
  }
  return tokens
}

export function createQuestionSearch(): MiniSearch<Question> {
  return new MiniSearch<Question>({
    fields: ['title', 'searchText', 'tags', 'no', 'chapter'],
    storeFields: ['id'],
    tokenize: cjkTokenizer,
    searchOptions: {
      boost: { title: 6, tags: 3, no: 2 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
    },
  })
}
