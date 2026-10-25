/**
 * 面试题库解析脚本
 * 读取 ../java 与 ../golang 下的 Markdown 文档,归一化为 JSON:
 *   public/data/index.json          专题元数据 / 高频榜 / 文档目录
 *   public/data/{topicId}.json      每专题题目(含预渲染 HTML)
 *   public/data/docs/{id}.json      特殊文档(README/面经/岗位分析)整体渲染
 * 带题数自检:与实测基准(Java 889 / Go 180)比对,偏差时报错退出。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import hljs from 'highlight.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const DOCS_ROOT = path.resolve(APP_ROOT, '..')
const JAVA_DIR = path.join(DOCS_ROOT, 'java')
const GO_DIR = path.join(DOCS_ROOT, 'golang')
const OUT_DIR = path.join(APP_ROOT, 'public', 'data')
const OUT_DOCS_DIR = path.join(OUT_DIR, 'docs')

/** 与逐文件实测一致的基准题数(逐文件核实),用于自检 */
const EXPECTED = {
  java: { 'java-01': 97, 'java-02': 61, 'java-03': 80, 'java-04': 72, 'java-05': 94, 'java-06': 90, 'java-07': 80, 'java-08': 89, 'java-09': 76, 'java-10': 56, 'java-11': 94 },
  go: { 'go-01': 75, 'go-02': 35, 'go-03': 21, 'go-04': 17, 'go-05': 32, 'go-index': 177 },
}

// ---------- Markdown 渲染(marked + highlight.js,构建时执行) ----------

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code(token) {
      const text = token.text ?? ''
      const lang = (token.lang || '').trim().split(/\s+/)[0]
      let body
      if (lang && hljs.getLanguage(lang)) {
        body = hljs.highlight(text, { language: lang, ignoreIllegals: true }).value
      } else {
        body = escapeHtml(text)
      }
      const langCls = lang ? ` language-${escapeHtml(lang)}` : ''
      return `<pre><code class="hljs"${langCls}>${body}</code></pre>\n`
    },
  },
})

function renderMarkdown(md) {
  return marked.parse(md || '', { async: false })
}

/** Markdown → 纯文本(供全文搜索) */
function mdToText(md) {
  return (md || '')
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?|```/g, ' '))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function extractUrls(text) {
  const urls = []
  const re = /https?:\/\/[^\s)】」'"]+/g
  let m
  while ((m = re.exec(text))) {
    urls.push(m[0].replace(/[。,;;]+$/, ''))
  }
  return [...new Set(urls)]
}

function extractLinks(text) {
  const links = []
  const re = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g
  let m
  while ((m = re.exec(text))) {
    links.push({ title: m[1].trim() || undefined, url: m[2] })
  }
  if (!links.length) {
    for (const url of extractUrls(text)) links.push({ url })
  }
  // 去重(按 url)
  const seen = new Set()
  return links.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)))
}

// ---------- 行标注:识别代码围栏,结构解析只看非围栏行 ----------

function annotate(text) {
  const lines = text.split(/\r?\n/)
  let fence = null
  return lines.map((text, i) => {
    const m = /^\s*(`{3,}|~{3,})(.*)$/.exec(text)
    if (m) {
      const marker = m[1][0]
      if (!fence) {
        fence = marker
        return { text, inFence: true, i }
      }
      if (fence === marker && !m[2].trim()) {
        fence = null
        return { text, inFence: true, i }
      }
    }
    return { text, inFence: !!fence, i }
  })
}

// ---------- Java 解析器 ----------
// 结构:h1 文档标题 → h2 简介 → h1/h2 章节 → ### Qn. 题目 → **频率**/**难度** 行 → 答案 → > 📌 来源:

function parseJavaTopic(filePath, topicId) {
  const annotated = annotate(fs.readFileSync(filePath, 'utf8'))
  const questions = []
  let chapter = ''
  let cur = null

  const flush = () => {
    if (cur) questions.push(buildJavaQuestion(cur, topicId, chapter))
    cur = null
  }

  for (const { text: line, inFence } of annotated) {
    if (inFence) {
      if (cur) cur.body.push(line)
      continue
    }
    const t = line.trim()
    let m
    if ((m = /^###\s+Q(\d+)\.\s*(.*)$/.exec(t))) {
      flush()
      cur = { no: `Q${m[1]}`, title: m[2].trim(), body: [], sourceMd: [] }
      continue
    }
    if (/^#{1,2}\s+/.test(t)) {
      // 文档标题 / 简介区 / 章节标题:均更新 chapter,首个问题出现前的值不会被用到
      chapter = t.replace(/^#{1,2}\s+/, '').trim()
      if (cur) flush()
      continue
    }
    if (!cur) continue
    if (/^>\s*📌?\s*来源[::：]/.test(t)) {
      cur.sourceMd.push(t)
      continue
    }
    cur.body.push(line)
  }
  flush()
  return questions
}

function buildJavaQuestion(raw, topicId, chapter) {
  const bodyLines = raw.body
  // 元信息:仅扫描前几行,避免误吞正文中的 ⭐/🔥
  const headLines = []
  for (const l of bodyLines) {
    if (l.trim() === '') {
      if (headLines.length) break
      continue
    }
    headLines.push(l)
    if (headLines.length >= 3) break
  }
  const head = headLines.join('\n')
  const freqMatch = /\*\*频率\*\*/.exec(head)
  const freq = freqMatch ? Math.min((head.slice(freqMatch.index).match(/🔥/g) || []).length, 5) || null : null
  const diffMatch = /\*\*难度\*\*/.exec(head)
  let difficulty = diffMatch ? (head.slice(diffMatch.index).match(/⭐/g) || []).length || null : null
  // java/11:考频内嵌标题「考频:🔥🔥🔥 字节 72 次」
  let frequency = freq
  if (!frequency) {
    const tMatch = /(?:考频|频率)[::：]\s*🔥*/.exec(raw.title)
    if (tMatch) {
      const n = (raw.title.slice(tMatch.index).match(/🔥/g) || []).length
      if (n) frequency = n
    }
  }
  if (!difficulty) {
    const n = (raw.title.match(/⭐/g) || []).length
    if (n) difficulty = n
  }

  // 答案 = 元信息行之后、来源行之前的全部内容
  const answerLines = []
  let metaDone = false
  for (const l of bodyLines) {
    if (!metaDone && /^\s*\*\*(频率|难度)\*\*/.test(l)) continue
    metaDone = true
    answerLines.push(l)
  }
  const answerMd = answerLines.join('\n').replace(/^\n+|\n+$/g, '')
  const answerText = mdToText(answerMd)

  const sources = raw.sourceMd.flatMap((l) => extractLinks(l.replace(/^>\s*📌?\s*来源[::：]\s*/, '')))

  const tags = []
  const lc = /LC\s*(\d+)/.exec(`${raw.title}\n${head}\n${answerMd}`)
  if (lc) tags.push(`LC ${lc[1]}`)
  if (/追问/.test(answerText)) tags.push('追问链')
  if (/存疑/.test(answerText) || /存疑/.test(raw.title)) tags.push('存疑')

  return {
    id: `${topicId}-${raw.no}`,
    language: 'java',
    topicId,
    chapter,
    no: raw.no,
    title: raw.title,
    frequency,
    difficulty,
    answerHtml: renderMarkdown(answerMd),
    searchText: mdToText(`${raw.title}\n${answerMd}`),
    sources,
    tags,
  }
}

// ---------- Golang 解析器 ----------
// 结构:h1 标题 → h2 目录 → h2 「一、章节」 → **Qn. 题干** → 【要点答案】 → … → 【来源】(节级)

function parseGoTopic(filePath, topicId) {
  const annotated = annotate(fs.readFileSync(filePath, 'utf8'))
  const questions = []
  let chapter = ''
  let sectionSources = []
  let cur = null
  let inSourceBlock = false
  let sectionStart = 0

  // 节级来源(【来源】块在节末)回填到本节所有题目
  const applySectionSources = () => {
    if (!sectionSources.length) return
    for (let i = sectionStart; i < questions.length; i++) {
      const q = questions[i]
      if (!q.sources.length) q.sources = dedupeSources(sectionSources)
      else q.sources = dedupeSources([...q.sources, ...sectionSources])
    }
    sectionSources = []
  }

  const flush = () => {
    if (cur) {
      questions.push(buildGoQuestion(cur, topicId, chapter))
    }
    cur = null
  }

  for (const { text: line, inFence } of annotated) {
    if (inFence) {
      if (cur) cur.answerLines.push(line)
      continue
    }
    const t = line.trim()
    let m

    // 1. 题目行(允许 **Qn.** 题干 与 **Qn. 题干** 两种形态)
    if ((m = /^\*\*(Q|C)(\d+)\.\s*(.*?)\*\*\s*(.*)$/.exec(t))) {
      flush()
      inSourceBlock = false
      const type = m[1]
      const title = `${m[3]} ${m[4]}`.replace(/[⭐]/g, '').trim()
      cur = {
        no: `${type}${m[2]}`,
        title,
        frequency: /⭐/.test(m[3]) || /⭐/.test(m[4]) ? 3 : null,
        answerLines: [],
        sources: [],
        isCode: type === 'C',
        answerStarted: false,
      }
      continue
    }

    // 2. 章节标题(「目录」「来源汇总」等无题章节自然产出 0 题)
    if (/^##\s+/.test(t)) {
      flush()
      applySectionSources()
      inSourceBlock = false
      chapter = t.replace(/^##\s+/, '').trim()
      sectionStart = questions.length
      continue
    }

    // 3. 【来源】标记:结束当前题,进入节级来源收集
    if (/^【来源】/.test(t)) {
      flush()
      inSourceBlock = true
      continue
    }

    // 4. 来源块内收集 URL,直至新章节/新题目
    if (inSourceBlock) {
      if (t === '---') continue
      for (const url of extractUrls(t)) sectionSources.push({ url })
      continue
    }

    // 5. 节间分隔线
    if (t === '---') {
      flush()
      continue
    }

    // 6. 【要点答案】标记
    if (/^【要点答案】/.test(t)) {
      if (cur) cur.answerStarted = true
      continue
    }

    // 7. 无题上下文时忽略其余内容
    if (!cur) continue

    // 8. 答案收集:首个非空行起(C 系列直接是代码块)
    if (!cur.answerStarted) {
      if (t === '') continue
      cur.answerStarted = true
    }
    cur.answerLines.push(line)
  }
  flush()
  applySectionSources()
  return questions
}

function dedupeSources(list) {
  const seen = new Set()
  return list.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)))
}

function buildGoQuestion(raw, topicId, chapter) {
  const answerMd = raw.answerLines.join('\n').replace(/^\n+|\n+$/g, '')
  const answerText = mdToText(answerMd)
  const tags = []
  if (raw.isCode) tags.push('代码输出题')
  if (/追问/.test(answerText)) tags.push('追问链')
  return {
    id: `${topicId}-${raw.no}`,
    language: 'go',
    topicId,
    chapter,
    no: raw.no,
    title: raw.title,
    frequency: raw.frequency,
    difficulty: null,
    answerHtml: renderMarkdown(answerMd),
    searchText: mdToText(`${raw.title}\n${answerMd}`),
    sources: raw.sources,
    tags,
  }
}

// ---------- golang/index.html:精编题库(177 题)+ 岗位画像长文 ----------

/** 把 CSS 的所有选择器前缀上 scope(:root 与 @ 规则除外),用于隔离第三方页面样式 */
function scopeCss(css, scope) {
  let i = 0
  let out = ''
  const n = css.length
  while (i < n) {
    if (/\s/.test(css[i])) { out += css[i++]; continue }
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i)
      out += css.slice(i, end + 2)
      i = end + 2
      continue
    }
    const brace = css.indexOf('{', i)
    if (brace === -1) { out += css.slice(i); break }
    const selector = css.slice(i, brace).trim()
    let depth = 1
    let j = brace + 1
    while (j < n && depth > 0) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    const body = css.slice(brace + 1, j - 1)
    if (selector.startsWith('@media') || selector.startsWith('@supports')) {
      out += `${selector}{${scopeCss(body, scope)}}`
    } else if (selector.startsWith('@') || selector.includes(':root')) {
      out += `${selector}{${body}}`
    } else {
      out += selector.split(',').map((s) => `${scope} ${s.trim()}`).join(',') + `{${body}}`
    }
    i = j
  }
  return out
}

function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
}

function extractGoIndex() {
  const file = path.join(GO_DIR, 'index.html')
  if (!fs.existsSync(file)) return null
  const html = fs.readFileSync(file, 'utf8')

  // 1) 截取「数据 + 静态渲染」脚本(交互逻辑之前),用记录型桩 document 求值,
  //    捕获原本由浏览器端 JS 注入的图表/面经/清单 HTML,并拿到 QS/TOPICS 等数据
  const scriptStart = html.indexOf('<script>') + '<script>'.length
  const scriptEnd = html.indexOf('</script>', scriptStart)
  let script = html.slice(scriptStart, scriptEnd)
  const cutIdx = script.indexOf('const state =')
  if (cutIdx !== -1) script = script.slice(0, cutIdx)

  const captured = {}
  const elementStub = () => ({
    _html: '',
    set innerHTML(v) { this._html = v },
    get innerHTML() { return this._html },
    textContent: '',
    style: {},
    addEventListener() {},
  })
  const doc = { getElementById: (id) => (captured[id] ??= elementStub()) }
  let data
  try {
    data = JSON.parse(
      new Function('document', 'localStorage', 'window', 'location', 'confirm',
        `${script};return JSON.stringify({QS,TOPICS,TNAME,EXPS,CHECKS})`)(
        doc,
        { getItem: () => null, setItem() {}, removeItem() {} },
        { addEventListener() {} },
        { hash: '' },
        () => false,
      ),
    )
  } catch (e) {
    console.warn(`!! golang/index.html 脚本求值失败:${e.message}`)
    return null
  }

  // 2) 题目 → 归一化 schema
  const SRC_LABEL = { common: '通用', blog: '博客', exp: '面经', retro: '复盘' }
  const questions = data.QS.map((q) => {
    const bullets = q.a.map((x) => `<li>${x}</li>`).join('\n')
    const follow = q.follow ? `\n<div class="follow-tip"><b>追问</b> ${q.follow}</div>` : ''
    const tags = [...(q.tags || []), SRC_LABEL[q.s] || q.s]
    if (q.follow) tags.push('追问链')
    return {
      id: `go-index-Q${q.id}`,
      language: 'go',
      topicId: 'go-index',
      chapter: data.TNAME[q.t] || q.t,
      no: `Q${q.id}`,
      title: q.q,
      frequency: q.f,
      difficulty: q.d,
      answerHtml: `<ul>\n${bullets}\n</ul>${follow}`,
      searchText: htmlToText(`${q.q}\n${q.a.join('\n')}${q.follow ? `\n追问 ${q.follow}` : ''}`),
      sources: [],
      tags,
    }
  })

  // 3) 画像长文:取 <main>,剔除题库节(已成专题),回填动态渲染块,重排节序号
  let mainHtml = /<main>([\s\S]*?)<\/main>/.exec(html)[1]
  mainHtml = mainHtml.replace(/<section id="bank">[\s\S]*?<\/section>\s*/, '')
  for (const id of ['chartUsage', 'chartJD', 'workMix', 'expGrid', 'checkList']) {
    const re = new RegExp(`(<(\\w+)\\b[^>]*id="${id}"[^>]*>)</\\2>`)
    mainHtml = mainHtml.replace(re, (_m, open, tag) => open + (captured[id]?.innerHTML ?? '') + `</${tag}>`)
  }
  mainHtml = mainHtml
    .replace('>05 — REAL INTERVIEWS', '>04 — REAL INTERVIEWS')
    .replace('>06 — STUDY PLAN', '>05 — STUDY PLAN')
    .replace('>07 — SOURCES', '>06 — SOURCES')

  // 4) 原页面样式整体作用域化,固定为浅色纸面(内嵌 <style> 随文档加载)
  const css = /<style>([\s\S]*?)<\/style>/.exec(html)[1]
  const scoped = scopeCss(css, '.go-profile')
  const docHtml = `<style>${scoped}
.go-profile{background:var(--bg);color:var(--ink);padding:20px 24px;border-radius:12px;font-size:14.5px;line-height:1.72}
.go-profile h1,.go-profile h2,.go-profile h3,.go-profile h4,.go-profile b{color:var(--ink)}
.go-profile th,.go-profile td{color:var(--ink-2)}
.go-profile .qtext,.go-profile .stat b{color:var(--ink)}
</style><div class="go-profile">${mainHtml}</div>`

  return { questions, docHtml, expCount: data.EXPS.length }
}

// ---------- README 高频榜抽取 ----------

function parseJavaTopList() {
  const text = fs.readFileSync(path.join(JAVA_DIR, 'README.md'), 'utf8')
  const start = text.indexOf('全题库最高频 30 题速查')
  if (start === -1) return []
  const rows = []
  for (const line of text.slice(start).split(/\r?\n/)) {
    const m = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/.exec(line.trim())
    if (m && !/^[#\s|:-]+$/.test(m[2]) && m[2] !== '题目') {
      rows.push({ rank: Number(m[1]), title: m[2], location: m[3].trim() })
    }
  }
  return rows
}

function parseGoTopList() {
  const text = fs.readFileSync(path.join(GO_DIR, 'README.md'), 'utf8')
  const start = text.indexOf('Top 10 高频题')
  if (start === -1) return []
  const rows = []
  for (const line of text.slice(start).split(/\r?\n/)) {
    const m = /^\s*(\d+)\.\s+(.+)$/.exec(line.trim())
    if (m) {
      const note = /（([^）]*)）/.exec(m[2])
      rows.push({ rank: Number(m[1]), title: m[2].replace(/（[^）]*）/, '').trim(), note: note ? note[1] : undefined })
    }
  }
  return rows
}

// ---------- 标题匹配(高频榜 → 题目 id,尽力而为) ----------

function normalizeTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[、,;:.?!？!：、;，。()（）/\\'"「」『』[\]【】—·＿_|*#-]/g, '')
}

function bigramSet(s) {
  const set = new Set()
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

function diceSimilarity(a, b) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return (2 * inter) / (a.size + b.size)
}

function buildTitleMatcher(allQuestions) {
  const entries = allQuestions
    .map((q) => ({ id: q.id, key: normalizeTitle(q.title), bigrams: null }))
    .filter((e) => e.key)
  for (const e of entries) e.bigrams = bigramSet(e.key)

  return function match(title) {
    const key = normalizeTitle(title)
    if (!key || key.length < 4) return null

    // 1. 精确匹配
    const exact = entries.find((e) => e.key === key)
    if (exact) return exact.id

    // 2. 子短语包含匹配:榜单条目常为「多题合并描述」,拆开后按主次顺序取首个命中
    const subPhrases = key.split(/[、;;/+/]|以及|与数据库/).map((s) => s.trim()).filter((s) => s.length >= 4)
    for (const sub of subPhrases) {
      let best = null
      let bestLen = 0
      for (const e of entries) {
        if (e.key.includes(sub) || sub.includes(e.key)) {
          const overlap = Math.min(e.key.length, sub.length)
          if (overlap > bestLen) {
            best = e.id
            bestLen = overlap
          }
        }
      }
      if (best) return best
    }

    // 3. 字符二元组相似度兜底
    const qBigrams = bigramSet(key)
    let best = null
    let bestSim = 0
    for (const e of entries) {
      const sim = diceSimilarity(qBigrams, e.bigrams)
      if (sim > bestSim) {
        best = e.id
        bestSim = sim
      }
    }
    return bestSim >= 0.5 ? best : null
  }
}

// ---------- Golang 去重:精编题库(go-index)吸收 md 专题中的近似重复题 ----------

const DEDUP_THRESHOLD = 0.5
/** 组合信号阈值:标题与答案要点重合度之和,实测 ≥0.75 的配对全部为真重复 */
const DEDUP_COMBO_THRESHOLD = 0.75

/** 去重专用归一化:在标题归一化基础上剥离疑问词干,让「XX的区别」与「XX 是什么」可比 */
function dedupKey(title) {
  let s = normalizeTitle(title)
  for (const w of ['什么区别', '是什么', '有什么', '的区别', '为什么', '哪些', '怎么', '如何']) {
    s = s.split(w).join('')
  }
  return s
}

/**
 * go-01..05(md 文档)中与精编题近似的题目被精编题吸收:
 * 保留精编版(元信息更全:难度/频率/标签/追问),合并 md 题的来源链接后剔除。
 * 判定为重复的信号(满足其一):
 *   1. 去重 key 互相包含;
 *   2. 标题二元组相似度 ≥ 0.5;
 *   3. 标题相似度 ≥ 0.3 且「标题 + 答案要点」组合相似度 ≥ 0.75(措辞差异大的漏网题)。
 */
function dedupeGoAgainstIndex(goMdTopics, indexQuestions) {
  const cands = indexQuestions.map((q) => ({
    q,
    key: dedupKey(q.title),
    ans: dedupKey(q.searchText.slice(0, 500)),
  }))
  const absorbed = new Map()
  const report = []
  for (const t of goMdTopics) {
    t.questions = t.questions.filter((q) => {
      if (q.tags.includes('代码输出题')) return true // C 系列实操题不参与去重
      const key = dedupKey(q.title)
      const ans = dedupKey(q.searchText.slice(0, 500))
      let best = null
      let bestCombo = -1
      let bestSim = 0
      for (const c of cands) {
        const tSim = diceSimilarity(bigramSet(key), bigramSet(c.key))
        const combo = tSim + diceSimilarity(bigramSet(ans), bigramSet(c.ans))
        const contained = key.length >= 4 && c.key.length >= 4 && (key.includes(c.key) || c.key.includes(key))
        const dup = contained || tSim >= DEDUP_THRESHOLD || (tSim >= 0.3 && combo >= DEDUP_COMBO_THRESHOLD)
        if (!dup) continue
        if (combo > bestCombo) {
          bestCombo = combo
          bestSim = tSim
          best = c.q
        }
      }
      if (!best) return true
      if (!absorbed.has(best.id)) absorbed.set(best.id, [])
      absorbed.get(best.id).push(...q.sources)
      report.push({ from: `${t.topicId}-${q.no}`, to: best.id, sim: bestSim.toFixed(2), title: q.title })
      return false
    })
  }
  for (const [id, sources] of absorbed) {
    const q = indexQuestions.find((x) => x.id === id)
    if (q && sources.length) q.sources = dedupeSources([...q.sources, ...sources])
  }
  return report
}

// ---------- 主流程 ----------

function listTopicFiles(dir, prefix) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => {
      const num = /^(\d+)[-–.]/.exec(f)
      return { file: f, topicId: `${prefix}-${num ? num[1] : f}` }
    })
}

function topicDisplayName(fileName) {
  return fileName.replace(/^(\d+)[-–.]/, '').replace(/\.md$/, '')
}

function chapterCounts(questions) {
  const order = []
  const map = new Map()
  for (const q of questions) {
    if (!map.has(q.chapter)) {
      map.set(q.chapter, 0)
      order.push(q.chapter)
    }
    map.set(q.chapter, map.get(q.chapter) + 1)
  }
  return order.map((name) => ({ name, count: map.get(name) }))
}

function main() {
  fs.mkdirSync(OUT_DOCS_DIR, { recursive: true })
  const allQuestions = []
  const topics = []

  // Java 专题
  const parsedCounts = {}
  for (const { file, topicId } of listTopicFiles(JAVA_DIR, 'java')) {
    const qs = parseJavaTopic(path.join(JAVA_DIR, file), topicId)
    parsedCounts[topicId] = qs.length
    allQuestions.push(...qs)
    topics.push({
      id: topicId,
      language: 'java',
      name: topicDisplayName(file),
      file,
      count: qs.length,
      chapters: chapterCounts(qs),
    })
    fs.writeFileSync(path.join(OUT_DIR, `${topicId}.json`), JSON.stringify({ topicId, questions: qs }))
  }

  // Golang md 专题(0 题的非问答文档如面经汇编/岗位分析只走 docs 渲染,不进题库)
  // 先解析并自检题数,去重完成后再构建专题
  const goMdTopics = []
  for (const { file, topicId } of listTopicFiles(GO_DIR, 'go')) {
    const qs = parseGoTopic(path.join(GO_DIR, file), topicId)
    if (!qs.length) continue
    parsedCounts[topicId] = qs.length
    goMdTopics.push({ topicId, name: topicDisplayName(file), file, questions: qs })
  }

  // golang/index.html:精编题库作为 go 首个专题,画像长文作为资料文档
  const goIndex = extractGoIndex()
  let goProfileDoc = null
  let dedupReport = []
  if (goIndex && goIndex.questions.length) {
    parsedCounts['go-index'] = goIndex.questions.length
    dedupReport = dedupeGoAgainstIndex(goMdTopics, goIndex.questions)
    allQuestions.push(...goIndex.questions)
    topics.push({
      id: 'go-index',
      language: 'go',
      name: 'Go 精编题库',
      file: 'index.html',
      count: goIndex.questions.length,
      chapters: chapterCounts(goIndex.questions),
    })
    fs.writeFileSync(path.join(OUT_DIR, 'go-index.json'), JSON.stringify({ topicId: 'go-index', questions: goIndex.questions }))
    goProfileDoc = {
      id: 'go-profile',
      language: 'go',
      title: '岗位画像与备考路线',
      description: '岗位职责画像 · 技术栈 · 方向差异 · 真实面经摘录 · 四周备考路线',
    }
  }

  // md 专题(去重后)构建
  for (const t of goMdTopics) {
    allQuestions.push(...t.questions)
    topics.push({
      id: t.topicId,
      language: 'go',
      name: t.name,
      file: t.file,
      count: t.questions.length,
      chapters: chapterCounts(t.questions),
    })
    fs.writeFileSync(path.join(OUT_DIR, `${t.topicId}.json`), JSON.stringify({ topicId: t.topicId, questions: t.questions }))
  }

  // 特殊文档整体渲染
  const docs = [
    { id: 'java-readme', language: 'java', file: path.join(JAVA_DIR, 'README.md'), title: 'Java 题库总览', description: '总说明、复习路径与最高频 30 题速查' },
    { id: 'go-readme', language: 'go', file: path.join(GO_DIR, 'README.md'), title: 'Golang 题库总览', description: '总说明、使用建议与 Top 10 高频题' },
    { id: 'go-interviews', language: 'go', file: path.join(GO_DIR, '06-真实面经汇编.md'), title: '真实面经汇编', description: '字节/腾讯/美团等 17 家公司分轮次真题' },
    { id: 'go-careers', language: 'go', file: path.join(GO_DIR, '07-岗位职责与就业方向分析.md'), title: '岗位与就业方向分析', description: '岗位职责、薪资与就业方向调研' },
  ]
  if (goProfileDoc) docs.push(goProfileDoc)
  for (const d of docs) {
    const html = d.id === 'go-profile' && goIndex
      ? goIndex.docHtml
      : renderMarkdown(fs.readFileSync(d.file, 'utf8'))
    fs.writeFileSync(path.join(OUT_DOCS_DIR, `${d.id}.json`), JSON.stringify({ id: d.id, title: d.title, html }))
  }

  // README 高频榜 + 尽力深链
  const match = buildTitleMatcher(allQuestions)
  const javaTop = parseJavaTopList().map((r) => ({ ...r, questionId: match(r.title) }))
  const goTop = parseGoTopList().map((r) => ({ ...r, questionId: match(r.title) }))

  const index = {
    generatedAt: new Date().toISOString(),
    counts: {
      java: allQuestions.filter((q) => q.language === 'java').length,
      go: allQuestions.filter((q) => q.language === 'go').length,
      total: allQuestions.length,
    },
    topics,
    topLists: { java: javaTop, go: goTop },
    docs: docs.map(({ id, language, title, description }) => ({ id, language, title, description })),
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2))

  // ---------- 自检(题数基准 = 去重前的解析结果) ----------
  console.log('=== 解析结果(去重前)===')
  let failed = false
  for (const [lang, map] of Object.entries(EXPECTED)) {
    for (const [topicId, expected] of Object.entries(map)) {
      const actual = parsedCounts[topicId] ?? 0
      const mark = actual === expected ? 'OK ' : '!! '
      console.log(`${mark}${topicId}: ${actual} (期望 ${expected})`)
      if (actual !== expected) failed = true
    }
  }
  if (dedupReport.length) {
    console.log(`\n=== Golang 去重:精编题吸收 ${dedupReport.length} 道近似重复题 ===`)
    for (const r of dedupReport) {
      console.log(`  - ${r.from} → ${r.to} (相似度 ${r.sim}) ${r.title}`)
    }
  }
  const noAnswer = allQuestions.filter((q) => !q.answerHtml || !q.searchText).map((q) => q.id)
  if (noAnswer.length) {
    console.log(`!! 空答案题目: ${noAnswer.join(', ')}`)
    failed = true
  }
  const linked = javaTop.filter((r) => r.questionId).length + goTop.filter((r) => r.questionId).length
  console.log(`\n高频榜深链: ${linked}/${javaTop.length + goTop.length}`)
  console.log(`合计(去重后): Java ${index.counts.java} 题, Go ${index.counts.go} 题, 共 ${index.counts.total} 题`)
  if (failed) {
    console.error('\n自检未通过:题数与基准不符,请检查解析规则!')
    process.exit(1)
  }
  console.log('\n自检通过。数据已写入 public/data/')
}

main()
