<script setup lang="ts">
import { computed } from 'vue'

/**
 * 极小的行内标记:刻意不引入 v-html —— 讲义来自外部 JSON,能少一个注入口就少一个。
 *
 * 支持四种标记:
 *   **粗体**        只用于术语与关键实体(密度应 ≤15%,否则强调失效)
 *   `代码`          行内代码
 *   [[关键结论]]    紫底高亮:一句话结论、需要背下来的句式
 *   !!易错点!!      红色:常被答错/踩坑的说法
 *
 * 额外支持「外层标记内部再嵌代码」:外层会递归解析一次。
 */
const props = defineProps<{ text?: string }>()

type Seg = { t: 'b' | 'c' | 'p' | 'h' | 'd'; v: string; inner?: Seg[] }

/**
 * 注意:正则必须每次新建。
 * 早期版本复用一个带 g 的模块级正则,递归解析时会把它的 lastIndex 重置为 0,
 * 外层 while 于是无限重复匹配同一个 token → 数组无限增长 → 浏览器 OOM 崩溃。
 */
const NESTED = /\*\*[\s\S]+?\*\*|`[^`]+`|\[\[[\s\S]+?\]\]|!![\s\S]+?!!/
const TOKEN = /\*\*[\s\S]+?\*\*|`[^`]+`|\[\[[\s\S]+?\]\]|!![\s\S]+?!!/g

/** 内层只再解析一层:code 与 bold。避免「标记套标记」把解析器拖进深递归 */
function innerOf(body: string): Seg[] {
  if (!NESTED.test(body)) return [{ t: 'p', v: body }]
  const out: Seg[] = []
  const re = new RegExp(TOKEN.source, 'g')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) out.push({ t: 'p', v: body.slice(last, m.index) })
    const tok = m[0]
    if (tok.startsWith('`')) out.push({ t: 'c', v: tok.slice(1, -1) })
    else if (tok.startsWith('**')) out.push({ t: 'b', v: tok.slice(2, -2) })
    else out.push({ t: 'p', v: tok.slice(2, -2) })
    last = m.index + tok.length
  }
  if (last < body.length) out.push({ t: 'p', v: body.slice(last) })
  return out
}

function parseInline(text: string): Seg[] {
  const out: Seg[] = []
  const re = new RegExp(TOKEN.source, 'g') // 局部实例,递归安全
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: 'p', v: text.slice(last, m.index) })
    const tok = m[0]
    if (tok.startsWith('**')) {
      const body = tok.slice(2, -2)
      out.push({ t: 'b', v: body, inner: innerOf(body) })
    } else if (tok.startsWith('[[')) {
      const body = tok.slice(2, -2)
      out.push({ t: 'h', v: body, inner: innerOf(body) })
    } else if (tok.startsWith('!!')) {
      const body = tok.slice(2, -2)
      out.push({ t: 'd', v: body, inner: innerOf(body) })
    } else {
      out.push({ t: 'c', v: tok.slice(1, -1) })
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push({ t: 'p', v: text.slice(last) })
  return out
}

const segments = computed<Seg[]>(() => parseInline(props.text ?? ''))
</script>

<template>
  <template v-for="(seg, i) in segments" :key="i">
    <strong v-if="seg.t === 'b'" class="font-semibold text-foreground">
      <template v-for="(s2, j) in seg.inner" :key="j">
        <code
          v-if="s2.t === 'c'"
          class="rounded bg-muted px-1 py-0.5 font-mono text-[0.86em] text-foreground/90"
          >{{ s2.v }}</code
        >
        <strong v-else-if="s2.t === 'b'" class="font-semibold">{{ s2.v }}</strong>
        <template v-else>{{ s2.v }}</template>
      </template>
    </strong>

    <span v-else-if="seg.t === 'h'" class="rich-hl">
      <template v-for="(s2, j) in seg.inner" :key="j">
        <code
          v-if="s2.t === 'c'"
          class="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.86em] text-foreground/90"
          >{{ s2.v }}</code
        >
        <strong v-else-if="s2.t === 'b'" class="font-semibold">{{ s2.v }}</strong>
        <template v-else>{{ s2.v }}</template>
      </template>
    </span>

    <span v-else-if="seg.t === 'd'" class="rich-danger">
      <template v-for="(s2, j) in seg.inner" :key="j">
        <code
          v-if="s2.t === 'c'"
          class="rounded bg-rose-500/10 px-1 py-0.5 font-mono text-[0.86em]"
          >{{ s2.v }}</code
        >
        <strong v-else-if="s2.t === 'b'" class="font-semibold">{{ s2.v }}</strong>
        <template v-else>{{ s2.v }}</template>
      </template>
    </span>

    <code
      v-else-if="seg.t === 'c'"
      class="rounded bg-muted px-1 py-0.5 font-mono text-[0.86em] text-foreground/90"
      >{{ seg.v }}</code
    >
    <template v-else>{{ seg.v }}</template>
  </template>
</template>
