// 块级编辑:按地址在作者源里定位一个区块,产出「替换 / 插入 / 删除」的单点编辑。
// 只依赖 AST 位置做切片,不做文本模式匹配 —— 手写正则改块曾一次误伤 7 处。
import { parse } from '@babel/parser'

const ADDR_RE =
  /^([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)#s([1-9][0-9]*)$/

/** 地址 = `课程/阶段/课时#s序号`,序号从 1 起,对应 sections 数组下标 + 1 */
export function parseAddr(addr) {
  const m = ADDR_RE.exec(String(addr).trim())
  if (!m) throw new Error(`地址格式应为 课程/阶段/课时#sN,收到「${addr}」`)
  return {
    courseId: m[1],
    stageId: m[2],
    lessonId: m[3],
    slot: Number(m[4]),
    index: Number(m[4]) - 1,
  }
}

const isNamedProp = (node, name) =>
  node?.type === 'ObjectProperty' &&
  !node.computed &&
  ((node.key.type === 'Identifier' && node.key.name === name) ||
    (node.key.type === 'StringLiteral' && node.key.value === name))

function propValue(objectNode, name) {
  if (!objectNode || objectNode.type !== 'ObjectExpression') return undefined
  return objectNode.properties.find((n) => isNamedProp(n, name))?.value
}

function findById(arrayNode, id) {
  if (!arrayNode || arrayNode.type !== 'ArrayExpression') return undefined
  return arrayNode.elements.find((el) => {
    if (!el || el.type !== 'ObjectExpression') return false
    const value = propValue(el, 'id')
    return value?.type === 'StringLiteral' && value.value === id
  })
}

/** 节点所在行的缩进。区块通常各自占行,序列化时用它对齐属性 */
function lineIndentAt(source, pos) {
  const lineStart = source.lastIndexOf('\n', pos - 1) + 1
  const head = source.slice(lineStart, pos)
  return /^[ \t]*$/.test(head) ? head : ''
}

/**
 * 在源码里定位区块。
 * @returns {{ sections: object, node: object, index: number, indent: string }}
 */
export function locateBlock(source, addr) {
  const { courseId, stageId, lessonId, index } = parseAddr(addr)
  const ast = parse(source, { sourceType: 'module' })
  const declaration = ast.program.body.find((n) => n.type === 'ExportDefaultDeclaration')?.declaration
  if (!declaration || declaration.type !== 'ObjectExpression') {
    throw new Error('作者源必须是 `export default { ... }` 对象字面量')
  }

  const courseIdNode = propValue(declaration, 'id')
  if (courseIdNode?.value !== courseId) {
    throw new Error(`文件里的课程是「${courseIdNode?.value}」,不是「${courseId}」`)
  }

  const stage = findById(propValue(declaration, 'stages'), stageId)
  if (!stage) throw new Error(`课程「${courseId}」里没有阶段「${stageId}」`)

  const lesson = findById(propValue(stage, 'lessons'), lessonId)
  if (!lesson) throw new Error(`阶段「${stageId}」里没有课时「${lessonId}」`)

  const sections = propValue(propValue(lesson, 'content'), 'sections')
  if (!sections || sections.type !== 'ArrayExpression') {
    throw new Error(`课时「${lessonId}」没有 content.sections`)
  }

  const node = sections.elements[index]
  if (!node) {
    throw new Error(`课时「${lessonId}」只有 ${sections.elements.length} 个区块,#s${index + 1} 越界`)
  }
  if (node.type !== 'ObjectExpression') {
    throw new Error(`#s${index + 1} 不是对象字面量,无法编辑`)
  }

  return { sections, node, index, indent: lineIndentAt(source, node.start) }
}

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const keyName = (key) => (IDENT_RE.test(key) ? key : quote(key))

function quote(text) {
  return `'${String(text)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n')}'`
}

const isPlain = (v) =>
  v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

/**
 * 把 JSON 值写成作者源风格的 JS 字面量:两空格缩进、单引号、多行末尾带逗号。
 * 对象全是标量时写一行(和图示 items 的写法一致),数组一律多行(和 body/points 一致)。
 */
export function serialize(value, indent = '') {
  if (isPlain(value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('不支持 NaN / Infinity')
    }
    if (typeof value === 'string') return quote(value)
    return String(value)
  }

  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const child = indent + '  '
    const lines = value.map((v) => child + serialize(v, child))
    return `[\n${lines.join(',\n')},\n${indent}]`
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined)
    if (!keys.length) return '{}'
    if (keys.every((k) => isPlain(value[k]))) {
      const inline = `{ ${keys.map((k) => `${keyName(k)}: ${serialize(value[k], indent)}`).join(', ')} }`
      if (inline.length <= 160) return inline
    }
    const child = indent + '  '
    const lines = keys.map((k) => `${child}${keyName(k)}: ${serialize(value[k], child)}`)
    return `{\n${lines.join(',\n')},\n${indent}}`
  }

  throw new Error(`不支持的值:${String(value)}`)
}

/** 单点编辑:{ start, end, text },交给 applyEdit 落盘 */
export function applyEdit(source, edit) {
  return source.slice(0, edit.start) + edit.text + source.slice(edit.end)
}

export function planReplace(source, addr, block) {
  const { node, indent } = locateBlock(source, addr)
  return { start: node.start, end: node.end, text: serialize(block, indent) }
}

function skipInline(source, pos) {
  while (source[pos] === ' ' || source[pos] === '\t') pos++
  return pos
}

export function planInsert(source, addr, block, position = 'after') {
  const { node, indent } = locateBlock(source, addr)
  const text = serialize(block, indent)

  if (position === 'before') {
    return { start: node.start, end: node.start, text: `${text},\n${indent}` }
  }

  // 插在锚点之后:紧贴锚点结尾插入,原有逗号原样保留(有则成 elem,\n新块, 无则补上)
  return { start: node.end, end: node.end, text: `,\n${indent}${text}` }
}

export function planRemove(source, addr) {
  const { node } = locateBlock(source, addr)
  const lineStart = source.lastIndexOf('\n', node.start - 1) + 1
  const atLineStart = /^[ \t]*$/.test(source.slice(lineStart, node.start))

  if (!atLineStart) {
    // 行内数组:优先吃后面的逗号,否则吃前面的
    const next = skipInline(source, node.end)
    if (source[next] === ',') return { start: node.start, end: next + 1, text: '' }
    let prev = node.start - 1
    while (source[prev] === ' ' || source[prev] === '\t') prev--
    if (source[prev] === ',') return { start: prev, end: node.end, text: '' }
    return { start: node.start, end: node.end, text: '' }
  }

  let end = skipInline(source, node.end)
  if (source[end] === ',') end = skipInline(source, end + 1)
  if (source[end] === '\r') end++
  if (source[end] === '\n') end++
  return { start: lineStart, end, text: '' }
}
