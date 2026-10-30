# DESIGN.md

面试刷题工作台（`app/`）的视觉系统说明。界面以「长时间阅读 + 高频自评」为主，属 Operate/Read 场景：扫描效率与稳定的阅读节奏优先于表现力。

## 颜色

所有颜色经 `src/style.css` 的 CSS 变量进入 Tailwind（`@theme inline`），组件不直接写色值。

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--background` / `--card` | `oklch(1 0 0)` / 同 | `0.145` / `0.205` | 页面与卡片底 |
| `--foreground` | `0.145` | `0.985` | 正文 |
| `--muted-foreground` | `0.5` | `0.708` | 次要文字，浅色下在 `bg-muted` 上仍 ≥4.5:1 |
| `--border` / `--input` | `0.922` | 白 10–15% | 分隔与描边 |
| `--ring` / `--sidebar-ring` | `0.5` | `0.62` | 焦点环，配合 `ring-ring/80` 达到 3:1 |
| `--accent` | `0.955` | `0.269` | hover / 选中底 |

**语言徽章**（`LANG_META.badge`）承载白字，固定使用 700 级底色：`amber-700` / `cyan-700` / `violet-600` / `emerald-700`。进度条（`bar`）不承载文字，保留更亮的品牌色。

**掌握状态三色**只维护在 `--status-mastered | fuzzy | wrong`（浅色 700 级、深色 400 级），组件统一用 `.status-mastered/.status-fuzzy/.status-wrong`；统计图通过 `getComputedStyle` 读取同一组变量，禁止再写十六进制。

## 字体与排版

- 中文正文 14px（`text-sm`），讲义正文可用 15–16px；元信息最低 11px，不再使用 10px。
- 标题：`h1` 页面标题 → `h2` 卡片/讲义区块标题，不允许跳级；`CardTitle` 渲染 `h2`。
- 中文标签不使用 `uppercase` 与额外字距；等宽字体只用于代码、编号与数据。
- 数字型数据加 `tabular-nums`。

## 布局与层次

- 卡片圆角 `rounded-xl`（12px），层次只靠 1px 描边，不用阴影堆叠。
- 悬停只改变描边或底色，不上浮、不加投影。
- 移动端底部导航 6 项，主区预留 `pb-20`；桌面侧栏 240px。
- 栅格与 flex 子项默认 `min-w-0`，任何横向可滚动内容只允许出现在自身容器内（表格、代码块）。

## 动效

- 页面切换 200ms、翻卡 160ms，只动 `opacity` 与 `transform`。
- `prefers-reduced-motion` 下全局降级为瞬时切换，状态变化本身保留。

## 可访问性

- 所有输入控件必须有程序化名称（`aria-label` 或关联 `label`）；图标按钮必须有名称。
- 焦点样式统一使用 `--ring`，不移除浏览器焦点。
- 颜色不单独承载状态：文字始终同时给出「会 / 模糊 / 不会」。
- 正文与占位文字 ≥4.5:1，大号文字 ≥3:1。

## 数据

进度、课程完成度、AI 会话均存 `localStorage`；导出/导入为 JSON 备份，重置需二次确认。
