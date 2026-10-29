#!/usr/bin/env node
/**
 * 课程区块工具 —— 按地址读 / 改单个区块,不靠文本模式匹配。
 *
 * 用法:
 *   node scripts/course-tool.mjs list [课程[/阶段[/课时]]]
 *   node scripts/course-tool.mjs show <地址> [--json]
 *   node scripts/course-tool.mjs patch <地址> --from <block.json> --expect <指纹> [--dry-run] [--force]
 *   node scripts/course-tool.mjs insert <地址> --from <block.json> --expect <指纹> [--before] [--dry-run] [--force]
 *   node scripts/course-tool.mjs rm <地址> --expect <指纹> [--dry-run] [--force]
 *
 * 地址形如 java-mysql-redis/index-btree#s3。
 * --expect 是 list / show 输出的块指纹,用于乐观并发:对不上说明区块已被改过,默认拒绝写入。
 * 写入前做字段白名单检查,写入后自动跑 build-courses --check;校验失败会还原原文件。
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { COURSES } from './curriculum/index.mjs'
import { BLOCK_FIELDS, BLOCK_KINDS } from './curriculum/schema.mjs'
import { hashBlock } from './curriculum/audit.mjs'
import {
  applyEdit,
  locateBlock,
  parseAddr,
  planInsert,
  planRemove,
  planReplace,
} from './curriculum/block-edit.mjs'
import { buildPlan, filterPlan, renderPlanSummary, renderPlanText, renderPrompt } from './curriculum/plan.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const CURRICULUM_DIR = path.join(__dirname, 'curriculum')
const NON_COURSE = new Set(['index.mjs', 'schema.mjs', 'audit.mjs', 'block-edit.mjs'])

const [, , cmd, ...rest] = process.argv

function usage() {
  console.log(`课程区块工具

  node scripts/course-tool.mjs list [课程[/阶段[/课时]]]
  node scripts/course-tool.mjs show <地址> [--json]
  node scripts/course-tool.mjs patch <地址> --from <block.json> --expect <指纹> [--dry-run]
  node scripts/course-tool.mjs insert <地址> --from <block.json> --expect <指纹> [--before]
  node scripts/course-tool.mjs rm <地址> --expect <指纹> [--dry-run]

  node scripts/course-tool.mjs plan [课程[/阶段[/课时]]] [--json]
  node scripts/course-tool.mjs plan <课程/阶段/课时> --prompt [--action explore|practice|metadata]

  地址:课程/阶段/课时#s序号,如 java-mysql-redis/index-btree#s3
  指纹:list / show 输出的 12 位哈希,防止改到别人刚改过的区块
  plan:算出每节课缺什么(练习 / explore / 未拆解真题),--prompt 输出单块填充提示词`)
}

function parseArgs(args) {
  const positional = []
  const opts = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = args[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      opts[key] = next
      i++
    } else {
      opts[key] = true
    }
  }
  return { positional, opts }
}

function listCourseFiles() {
  return fs
    .readdirSync(CURRICULUM_DIR, { recursive: true })
    .filter((entry) => entry.endsWith('.mjs') && !entry.endsWith('.test.mjs'))
    .filter((entry) => !NON_COURSE.has(path.basename(entry)))
    .map((entry) => path.join(CURRICULUM_DIR, entry))
}

async function findCourse(courseId) {
  for (const file of listCourseFiles()) {
    const mod = await import(pathToFileURL(file).href)
    if (mod.default?.id === courseId) return { spec: mod.default, file }
  }
  throw new Error(`找不到课程「${courseId}」(作者源里没有匹配的 export default)`)
}

function sectionsOf(spec, stageId, lessonId) {
  const stage = spec.stages?.find((s) => s.id === stageId)
  if (!stage) throw new Error(`课程「${spec.id}」里没有阶段「${stageId}」`)
  const lesson = stage.lessons?.find((l) => l.id === lessonId)
  if (!lesson) throw new Error(`阶段「${stageId}」里没有课时「${lessonId}」`)
  const sections = lesson.content?.sections
  if (!Array.isArray(sections)) throw new Error(`课时「${lessonId}」没有 content.sections`)
  return sections
}

function blockAt(spec, { stageId, lessonId, index, slot }) {
  const sections = sectionsOf(spec, stageId, lessonId)
  const block = sections[index]
  if (!block) {
    throw new Error(`课时「${lessonId}」只有 ${sections.length} 个区块,#s${slot} 越界`)
  }
  return block
}

/** 校验字段并整理成 schema 顺序(白名单之外的字段会让渲染器静默丢内容,直接拒绝) */
function prepareBlock(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('区块文件必须是单个 JSON 对象')
  }
  if (!BLOCK_KINDS.has(raw.kind)) {
    throw new Error(`kind 不合法:${JSON.stringify(raw.kind)}(可选 ${[...BLOCK_KINDS].join(' / ')})`)
  }
  const allowed = BLOCK_FIELDS[raw.kind] ?? []
  const unknown = Object.keys(raw).filter((key) => !allowed.includes(key))
  if (unknown.length) {
    throw new Error(
      `未知字段 ${unknown.join(', ')} —— 渲染器不会读它,内容会静默消失。允许:${allowed.join(' / ')}`,
    )
  }
  if (!raw.title || !String(raw.title).trim()) throw new Error('缺少 title')
  const ordered = {}
  for (const key of allowed) if (key in raw) ordered[key] = raw[key]
  return ordered
}

function readBlockFile(file) {
  if (!file || file === true) throw new Error('缺少 --from <block.json>')
  const abs = path.resolve(process.cwd(), file)
  if (!fs.existsSync(abs)) throw new Error(`找不到区块文件「${abs}」`)
  let data
  try {
    data = JSON.parse(fs.readFileSync(abs, 'utf8'))
  } catch (error) {
    throw new Error(`区块文件不是合法 JSON:${error.message}`)
  }
  return prepareBlock(data)
}

function expectHash(opts, current, label) {
  if (opts.force) return
  if (!opts.expect || opts.expect === true) {
    throw new Error(`缺少 --expect ${current}(用 list / show 查到的${label}指纹;确认要覆盖时加 --force)`)
  }
  if (String(opts.expect) !== current) {
    throw new Error(
      `指纹不匹配:你看到的是 ${opts.expect},当前是 ${current}。先 show 确认,或加 --force 覆盖`,
    )
  }
}

/** 序列化出的文本统一是 LF;写回时跟随源文件,避免把 CRLF 文件改成混合换行 */
function matchEol(edit, source) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  return { ...edit, text: edit.text.replace(/\r?\n/g, eol) }
}

function loadQuestions() {
  const dataDir = path.join(APP_ROOT, 'public/data')
  const indexFile = path.join(dataDir, 'index.json')
  if (!fs.existsSync(indexFile)) throw new Error('缺少 public/data/index.json,先跑 npm run parse')
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'))
  const map = new Map()
  for (const topic of index.topics ?? []) {
    const file = path.join(dataDir, `${topic.id}.json`)
    if (!fs.existsSync(file)) continue
    for (const q of JSON.parse(fs.readFileSync(file, 'utf8')).questions ?? []) map.set(q.id, q)
  }
  return map
}

function loadGenerated(courseId) {
  const file = path.join(APP_ROOT, 'public/data/courses', `${courseId}.json`)
  if (!fs.existsSync(file)) {
    throw new Error(`缺少课程产物 public/data/courses/${courseId}.json,先跑 npm run courses`)
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function runCheck() {  const res = spawnSync(process.execPath, [path.join(__dirname, 'build-courses.mjs'), '--check'], {
    cwd: APP_ROOT,
    encoding: 'utf8',
  })
  return { ok: res.status === 0, output: `${res.stdout ?? ''}${res.stderr ?? ''}`.trim() }
}

function writeAndValidate(file, next, prev, { dryRun, preview }) {
  if (dryRun) {
    console.log('--- dry-run,未写入 ---')
    console.log(preview)
    return true
  }
  const tmp = `${file}.tmp-${process.pid}`
  fs.writeFileSync(tmp, next)
  fs.renameSync(tmp, file)

  const check = runCheck()
  if (check.ok) {
    console.log('✓ 已写入,构建校验通过')
    return true
  }
  fs.writeFileSync(tmp, prev)
  fs.renameSync(tmp, file)
  console.error('✗ 构建校验失败,已还原原文件:\n')
  console.error(check.output)
  return false
}

async function cmdPlan(args) {
  const { positional, opts } = parseArgs(args)
  const scope = positional[0] ?? ''
  const parts = scope ? scope.split('/') : []
  const questions = loadQuestions()

  const specs = parts.length
    ? [COURSES.find((c) => c.id === parts[0])]
    : [...COURSES].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (!specs[0]) throw new Error(`找不到课程「${parts[0]}」`)

  const plans = specs.map((spec) =>
    filterPlan(buildPlan({ spec, courseData: loadGenerated(spec.id), questions }), {
      stageId: parts[1],
      lessonId: parts[2],
    }),
  )

  if (opts.prompt) {
    if (parts.length !== 3) throw new Error('--prompt 需要精确到课时:课程/阶段/课时')
    const text = renderPrompt(plans[0], parts.join('/'), opts.action)
    console.log(text ?? `${scope} 没有待办动作`)
    return true
  }

  if (opts.json) {
    console.log(JSON.stringify(plans.length === 1 ? plans[0] : plans, null, 2))
    return true
  }

  if (plans.length === 1) {
    console.log(renderPlanText(plans[0]))
  } else {
    for (const plan of plans) console.log(renderPlanSummary(plan))
    const total = plans.reduce((n, plan) => n + plan.actions.length, 0)
    console.log(`\n合计待办 ${total} 项;用 plan <课程> 看明细,--prompt 取单块提示词`)
  }
  return true
}

async function cmdList(args) {
  const { positional } = parseArgs(args)
  const key = positional[0]
  if (!key) {
    for (const spec of [...COURSES].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      const lessons = spec.stages.flatMap((s) => s.lessons ?? [])
      const blocks = lessons.reduce((n, l) => n + (l.content?.sections?.length ?? 0), 0)
      console.log(`${spec.id.padEnd(26)} ${String(lessons.length).padStart(3)} 课时 ${String(blocks).padStart(4)} 区块`)
    }
    return true
  }

  const parts = key.split('/')
  const spec = COURSES.find((c) => c.id === parts[0])
  if (!spec) throw new Error(`找不到课程「${parts[0]}」`)

  if (parts.length === 1) {
    for (const stage of spec.stages ?? []) {
      console.log(`${spec.id}/${stage.id}`)
      for (const lesson of stage.lessons ?? []) {
        const n = lesson.content?.sections?.length ?? 0
        console.log(`  ${lesson.id.padEnd(28)} ${String(n).padStart(2)} 区块  ${lesson.title}`)
      }
    }
    return true
  }

  const [, stageId, lessonId] = parts
  const sections = sectionsOf(spec, stageId, lessonId)
  sections.forEach((block, i) => {
    const addr = `${spec.id}/${stageId}/${lessonId}#s${i + 1}`
    console.log(`${addr.padEnd(52)} ${String(block.kind).padEnd(10)} ${hashBlock(block)}  ${block.title ?? ''}`)
  })
  return true
}

async function cmdShow(args) {
  const { positional, opts } = parseArgs(args)
  const addr = positional[0]
  if (!addr) throw new Error('缺少地址')
  const parsed = parseAddr(addr)
  const { spec, file } = await findCourse(parsed.courseId)
  const block = blockAt(spec, parsed)
  const source = fs.readFileSync(file, 'utf8')
  const { node } = locateBlock(source, addr)

  if (opts.json) {
    console.log(JSON.stringify(block, null, 2))
    return true
  }
  console.log(`${addr}  ${block.kind}  ${hashBlock(block)}`)
  console.log(`title: ${block.title ?? ''}`)
  console.log(`file:  ${path.relative(APP_ROOT, file)}`)
  console.log('')
  console.log(source.slice(node.start, node.end))
  return true
}

async function cmdPatch(args) {
  const { positional, opts } = parseArgs(args)
  const addr = positional[0]
  if (!addr) throw new Error('缺少地址')
  const parsed = parseAddr(addr)
  const { spec, file } = await findCourse(parsed.courseId)
  const current = blockAt(spec, parsed)
  expectHash(opts, hashBlock(current), '被替换区块')

  const block = readBlockFile(opts.from)
  const source = fs.readFileSync(file, 'utf8')
  const edit = matchEol(planReplace(source, addr, block), source)

  console.log(`~ ${addr}  ${current.kind} ${hashBlock(current)} → ${block.kind} ${hashBlock(block)}`)
  return writeAndValidate(file, applyEdit(source, edit), source, { dryRun: opts['dry-run'], preview: edit.text })
}

async function cmdInsert(args) {
  const { positional, opts } = parseArgs(args)
  const addr = positional[0]
  if (!addr) throw new Error('缺少地址')
  const parsed = parseAddr(addr)
  const { spec, file } = await findCourse(parsed.courseId)
  const anchor = blockAt(spec, parsed)
  expectHash(opts, hashBlock(anchor), '锚点区块')

  const block = readBlockFile(opts.from)
  const position = opts.before ? 'before' : 'after'
  const source = fs.readFileSync(file, 'utf8')
  const edit = matchEol(planInsert(source, addr, block, position), source)

  console.log(`+ ${addr} ${position === 'before' ? '之前' : '之后'} 插入 ${block.kind} ${hashBlock(block)}`)
  console.log('  插入后该课时后续区块序号整体后移,旧地址的指纹会变')
  return writeAndValidate(file, applyEdit(source, edit), source, { dryRun: opts['dry-run'], preview: edit.text })
}

async function cmdRemove(args) {
  const { positional, opts } = parseArgs(args)
  const addr = positional[0]
  if (!addr) throw new Error('缺少地址')
  const parsed = parseAddr(addr)
  const { spec, file } = await findCourse(parsed.courseId)
  const current = blockAt(spec, parsed)
  expectHash(opts, hashBlock(current), '被删除区块')

  const source = fs.readFileSync(file, 'utf8')
  const { node } = locateBlock(source, addr)
  const edit = planRemove(source, addr)

  console.log(`- ${addr}  ${current.kind} ${hashBlock(current)}  ${current.title ?? ''}`)
  return writeAndValidate(file, applyEdit(source, edit), source, {
    dryRun: opts['dry-run'],
    preview: source.slice(node.start, node.end),
  })
}

const commands = {
  list: cmdList,
  show: cmdShow,
  patch: cmdPatch,
  insert: cmdInsert,
  rm: cmdRemove,
  plan: cmdPlan,
}

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') {
    usage()
    return
  }
  const run = commands[cmd]
  if (!run) {
    usage()
    throw new Error(`未知命令「${cmd}」`)
  }
  const ok = await run(rest)
  if (!ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(`✗ ${error.message}`)
  process.exitCode = 1
})
