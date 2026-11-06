<script setup lang="ts">
/**
 * 每个阶段各自的一张微图。六种形状真的不同，不是「同一张卡换个标题」：
 * 这一层回答的是「这个阶段里发生了什么」，外层链路回答的是「阶段之间怎么接上」。
 * 全部用 currentColor + Tailwind 文本色，自动跟随亮暗主题。
 */
import type { StageVisual } from '@/lib/types'

defineProps<{ kind: StageVisual['kind'] }>()
</script>

<template>
  <svg
    viewBox="0 0 132 52"
    class="h-[52px] w-full"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- ① 编译：源文件 → javac → class 文件 -->
    <g v-if="kind === 'file'" class="text-muted-foreground/70">
      <path d="M10 9 h18 l7 7 v27 H10 Z" />
      <path d="M28 9 v7 h7" />
      <text x="14" y="34" font-size="8" stroke="none" fill="currentColor">.java</text>
      <g class="text-primary">
        <path d="M44 26 h20 m-5 -4 5 4 -5 4" />
      </g>
      <text x="47" y="18" font-size="7" stroke="none" fill="currentColor">javac</text>
      <path d="M72 9 h18 l7 7 v27 H72 Z" />
      <path d="M90 9 v7 h7" />
      <text x="76" y="34" font-size="8" stroke="none" fill="currentColor">.class</text>
      <path d="M104 26 h18" class="text-muted-foreground/40" />
    </g>

    <!-- ② 启动：终端命令 → JVM 进程 -->
    <g v-else-if="kind === 'command'" class="text-muted-foreground/70">
      <rect x="8" y="9" width="58" height="34" rx="3" />
      <path d="M8 17 h58" />
      <circle cx="13" cy="13" r="1" stroke="none" fill="currentColor" />
      <circle cx="18" cy="13" r="1" stroke="none" fill="currentColor" />
      <text x="14" y="31" font-size="8" stroke="none" fill="currentColor">$ java Hello</text>
      <path d="M70 26 h16 m-5 -4 5 4 -5 4" class="text-primary" />
      <rect x="90" y="12" width="34" height="28" rx="3" />
      <path d="M96 21 h22 M96 26 h22 M96 31 h14" class="text-muted-foreground/45" />
    </g>

    <!-- ③ 类加载：加载 → 链接 → 初始化 -->
    <g v-else-if="kind === 'pipeline'" class="text-muted-foreground/70">
      <rect x="7" y="13" width="34" height="26" rx="3" />
      <rect x="49" y="13" width="34" height="26" rx="3" />
      <rect x="91" y="13" width="34" height="26" rx="3" />
      <text x="14" y="30" font-size="8" stroke="none" fill="currentColor">加载</text>
      <text x="56" y="30" font-size="8" stroke="none" fill="currentColor">链接</text>
      <text x="96" y="30" font-size="8" stroke="none" fill="currentColor">初始化</text>
      <path d="M41 26 h8 m-3 -3 3 3 -3 3 M83 26 h8 m-3 -3 3 3 -3 3" class="text-primary" />
      <path d="M49 43 h34" stroke-dasharray="2 3" class="text-muted-foreground/40" />
      <text x="55" y="50" font-size="7" stroke="none" fill="currentColor">验证 / 准备 / 解析</text>
    </g>

    <!-- ④ 首次执行：逐条字节码 → 逐条机器指令 -->
    <g v-else-if="kind === 'interpreter'" class="text-muted-foreground/70">
      <rect x="8" y="8" width="42" height="9" rx="1.5" />
      <rect x="8" y="21" width="42" height="9" rx="1.5" />
      <rect x="8" y="34" width="42" height="9" rx="1.5" />
      <text x="12" y="15" font-size="6.5" stroke="none" fill="currentColor">iload_1</text>
      <text x="12" y="28" font-size="6.5" stroke="none" fill="currentColor">iadd</text>
      <text x="12" y="41" font-size="6.5" stroke="none" fill="currentColor">ireturn</text>
      <g class="text-primary">
        <path d="M54 12.5 h18 m-4 -3 4 3 -4 3" />
        <path d="M54 25.5 h18 m-4 -3 4 3 -4 3" />
        <path d="M54 38.5 h18 m-4 -3 4 3 -4 3" />
      </g>
      <rect x="78" y="8" width="46" height="35" rx="3" />
      <path d="M84 16 h34 M84 23 h26 M84 30 h34 M84 37 h20" class="text-muted-foreground/45" />
    </g>

    <!-- ⑤ 热点探测：递增计数越过阈值 -->
    <g v-else-if="kind === 'counter'" class="text-muted-foreground/70">
      <path d="M8 42 h118" />
      <rect x="16" y="34" width="12" height="8" rx="1" />
      <rect x="38" y="29" width="12" height="13" rx="1" />
      <rect x="60" y="24" width="12" height="18" rx="1" />
      <rect x="82" y="26" width="12" height="16" rx="1" />
      <rect x="104" y="12" width="12" height="30" rx="1" class="text-primary" />
      <path d="M8 19 h118" stroke-dasharray="3 3" class="text-primary" />
      <text x="9" y="15" font-size="7" stroke="none" fill="currentColor">CompileThreshold</text>
      <path d="M98 10 h24 m-4 -3 4 3 -4 3" class="text-primary" />
    </g>

    <!-- ⑥ JIT：热点字节码 → 编译 → 本地机器码芯片 -->
    <g v-else class="text-muted-foreground/70">
      <rect x="8" y="15" width="26" height="22" rx="2" />
      <text x="12" y="29" font-size="7" stroke="none" fill="currentColor">.class</text>
      <g class="text-primary">
        <circle cx="58" cy="26" r="9" />
        <circle cx="58" cy="26" r="3" />
        <path d="M58 14 v4 M58 34 v4 M46 26 h4 M66 26 h4 M50 18 l3 3 M63 31 l3 3 M66 18 l-3 3 M53 31 l-3 3" />
      </g>
      <path d="M40 26 h8 m-3 -3 3 3 -3 3 M74 26 h10 m-4 -3 4 3 -4 3" class="text-muted-foreground/50" />
      <rect x="90" y="13" width="32" height="26" rx="2" />
      <path d="M96 8 v5 M104 8 v5 M112 8 v5 M96 39 v5 M104 39 v5 M112 39 v5" />
      <text x="95" y="30" font-size="7" stroke="none" fill="currentColor">机器码</text>
    </g>
  </svg>
</template>
