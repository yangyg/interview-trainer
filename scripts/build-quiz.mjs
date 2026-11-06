/**
 * 把题库（长答题）编译成可判定的客观小题。
 *
 * 产物：
 *   public/data/quiz/index.json        全局索引（counts / buildHash / topics）
 *   public/data/quiz/<topicId>.json    每专题的题库池
 *
 * 用法：
 *   node scripts/build-quiz.mjs            生成并写盘（内容不变则不写）
 *   node scripts/build-quiz.mjs --check    只校验产物是否与当前题库一致
 *   node scripts/build-quiz.mjs --audit    额外打印可疑项，供人工抽查
 *
 * 题库更新后：item id 会随题号保持稳定（`${srcId}:t1:1`），
 * 因此重建不会影响绑在 srcId 上的学习进度。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseAnswer, plainOfMarked } from './quizgen/html.mjs'
import { buildCorpus, dice } from './quizgen/corpus.mjs'
import { buildT1 } from './quizgen/t1-term.mjs'
import { buildT2, pointOf } from './quizgen/t2-points.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data')
const OUT = join(DATA, 'quiz')

const flags = new Set(process.argv.slice(2))
const CHECK = flags.has('--check')
const AUDIT = flags.has('--audit')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeIfChanged(path, text) {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return false
  writeFileSync(path, text)
  return true
}

function sha1(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 16)
}

const dropCounts = new Map()
function drop(reason) {
  dropCounts.set(reason, (dropCounts.get(reason) ?? 0) + 1)
}

function main() {
  const index = readJson(join(DATA, 'index.json'))
  const topicDocs = index.topics.map((topic) => ({
    topic,
    questions: readJson(join(DATA, `${topic.id}.json`)).questions,
  }))

  const corpus = buildCorpus(topicDocs)

  // 两遍：先按语言建要点池（T2 的错项来源），再逐题生成
  const pointsByLang = new Map()
  const parsedByTopic = new Map()
  for (const { topic, questions } of topicDocs) {
    const parsedMap = new Map()
    const points = pointsByLang.get(topic.language) ?? []
    for (const q of questions) {
      const parsed = parseAnswer(q.answerHtml)
      parsedMap.set(q.id, parsed)
      for (const block of parsed.blocks) {
        if (block.tag !== 'ul' && block.tag !== 'ol') continue
        if (block.items.length < 2 || block.items.length > 6) continue
        for (const item of block.items) {
          const point = pointOf(item.html, {
            srcId: q.id,
            topicId: q.topicId,
            language: q.language,
            chapter: q.chapter,
            srcNo: q.no,
            srcTitle: q.title,
          })
          if (point) points.push(point)
        }
      }
    }
    parsedByTopic.set(topic.id, parsedMap)
    pointsByLang.set(topic.language, points)
  }

  mkdirSync(OUT, { recursive: true })

  const summaryTopics = []
  const fingerprints = []
  const byType = { T1: 0, T2: 0, T3: 0, T4: 0 }
  const auditSamples = []

  for (const { topic, questions } of topicDocs) {
    const parsedMap = parsedByTopic.get(topic.id)
    const pool = pointsByLang.get(topic.language) ?? []
    const items = []

    for (const q of questions) {
      const parsed = parsedMap.get(q.id)
      items.push(...buildT1(q, parsed, corpus, drop))
      items.push(...buildT2(q, parsed, pool, drop))
    }

    // 结构断言：宁可构建失败，也不要把坏题发到线上
    const seen = new Set()
    for (const item of items) {
      if (seen.has(item.id)) throw new Error(`重复的题目 id: ${item.id}`)
      seen.add(item.id)
      if (!item.options || item.options.length < 4) throw new Error(`选项不足: ${item.id}`)
      if (item.type === 'T1' && !item.options.some((o) => o.key === item.answerKey)) {
        throw new Error(`T1 答案不在选项里: ${item.id}`)
      }
      if (item.type === 'T2') {
        if (item.answerKeys.length < 2) throw new Error(`T2 正确项不足: ${item.id}`)
        for (const key of item.answerKeys) {
          if (!item.options.some((o) => o.key === key)) throw new Error(`T2 答案不在选项里: ${item.id}`)
        }
      }
      // 解析占位符必须全部还原；T1 必须恰好一个空位，否则题干会把答案直接亮出来
      const text = item.stemHtml + item.explainHtml + item.options.map((o) => o.html).join('')
      if (/[\u0001\u0002]/.test(text)) throw new Error(`题目含未还原的占位符: ${item.id}`)
      if (item.type === 'T1') {
        const blanks = (item.stemHtml.match(/class="blank"/g) ?? []).length
        if (blanks !== 1) throw new Error(`T1 必须恰好一个空位（当前 ${blanks}）: ${item.id}`)
      }
      byType[item.type] += 1
      fingerprints.push(`${item.id}|${item.stemHtml}|${item.answerKey ?? item.answerKeys.join('')}`)
    }

    if (AUDIT && items.length) {
      auditSamples.push({ topicId: topic.id, sample: items.find((i) => i.type === 'T1') ?? items[0] })
    }

    writeIfChanged(join(OUT, `${topic.id}.json`), JSON.stringify({ topicId: topic.id, items }))
    summaryTopics.push({
      id: topic.id,
      language: topic.language,
      name: topic.name,
      items: items.length,
      bosses: questions.length,
    })
  }

  const total = Object.values(byType).reduce((a, b) => a + b, 0)
  const buildHash = sha1(fingerprints.sort().join('\n'))
  const next = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: index.generatedAt,
    buildHash,
    counts: { total, byType },
    topics: summaryTopics,
  }

  const indexPath = join(OUT, 'index.json')
  const prev = existsSync(indexPath) ? readJson(indexPath) : null
  const drifted = prev && prev.buildHash !== buildHash

  if (CHECK) {
    if (!prev) {
      console.error('✗ 未找到 public/data/quiz/index.json，请先运行 npm run quiz')
      process.exit(1)
    }
    if (drifted) {
      console.error(`✗ 客观题库与当前题库不一致（${prev.counts.total} → ${total}）`)
      console.error('  请运行 npm run quiz 重新生成')
      process.exit(1)
    }
    console.log(`✓ 客观题库已是最新（${total} 项，hash ${buildHash}）`)
    return
  }

  // generatedAt 每次都变，会让文件反复重写；内容不变时保留旧时间戳
  const payload = drifted || !prev
    ? next
    : { ...next, generatedAt: prev.generatedAt }
  writeIfChanged(indexPath, JSON.stringify(payload, null, 2))

  console.log(`✓ 客观题库：${total} 项（T1 ${byType.T1} / T2 ${byType.T2}），${summaryTopics.length} 个专题`)
  console.log(`  hash ${buildHash}${drifted ? '（已更新）' : '（内容未变）'}`)

  if (AUDIT) {
    console.log('\n—— 丢弃原因 top20 ——')
    const sorted = [...dropCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
    for (const [reason, count] of sorted) console.log(`  ${reason}: ${count}`)

    console.log('\n—— 每专题产出 ——')
    for (const t of summaryTopics) console.log(`  ${t.id}: ${t.items} 项 / ${t.bosses} 原题`)

    console.log('\n—— 抽样（人工看质量）——')
    for (const { topicId, sample } of auditSamples.slice(0, 6)) {
      console.log(`\n[${topicId}] ${sample.id} (${sample.type})`)
      console.log('  题干:', plainOfMarked(sample.stemHtml.replace(/<[^>]+>/g, '')).slice(0, 160))
      for (const option of sample.options) {
        const mark = option.key === sample.answerKey || sample.answerKeys?.includes(option.key) ? '✓' : ' '
        console.log(`  ${mark}${option.key}. ${option.html.replace(/<[^>]+>/g, '')}`)
      }
    }

    console.log('\n—— 最接近「两个都对」的 T2 选项对（阈值 0.45）——')
    const suspicious = []
    for (const { id } of summaryTopics) {
      const file = join(OUT, `${id}.json`)
      if (!existsSync(file)) continue
      for (const item of readJson(file).items) {
        if (item.type !== 'T2') continue
        const positives = item.options.filter((o) => item.answerKeys.includes(o.key))
        const negatives = item.options.filter((o) => !item.answerKeys.includes(o.key))
        for (const p of positives) {
          for (const n of negatives) {
            const score = dice(p.html.replace(/<[^>]+>/g, ''), n.html.replace(/<[^>]+>/g, ''))
            suspicious.push({ score, id: item.id, p: p.html.replace(/<[^>]+>/g, ''), n: n.html.replace(/<[^>]+>/g, '') })
          }
        }
      }
    }
    suspicious.sort((a, b) => b.score - a.score)
    for (const row of suspicious.slice(0, 8)) {
      console.log(`  ${row.score.toFixed(2)} ${row.id}`)
      console.log(`     正: ${row.p.slice(0, 70)}`)
      console.log(`     错: ${row.n.slice(0, 70)}`)
    }
  }
}

main()
