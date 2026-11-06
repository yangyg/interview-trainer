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

## 移动端（< lg / 1024px）

移动壳与桌面壳在 `App.vue` 按 `usePlatform().isMobile` 切换；桌面（lg+）保持上述桌面规范不变。移动端规范是对基础规则的原生分化例外：

**壳与导航**
- 底栏固定 5 tab（首页 / 课程 / 题库 / 背题 / 我的），高度基准 `--tabbar-height: 3.5rem`；模考、错题本、统计、面经收进「我的」聚合页（原生设置页风格，`CellList`/`CellItem`）。
- 页头 48px 吸顶毛玻璃（`bg-background/80 backdrop-blur-xl` + `pt-safe`），下钻页（`meta.level: 2`）左上角返回；tab 根页不放页内 h1（页头已有标题）。
- 底栏下滚收起、上滚出现；模考 / 背题会话中通过 `useTabBarHidden` 完全隐藏（沉浸模式）。

**safe-area**
- `index.html` viewport 必须 `viewport-fit=cover`；工具类 `pt-safe / pb-safe / px-safe`（`style.css`），内容区用 `pb-tabbar` 让位底栏。`env()` 只在这几处出现，不散落组件。

**弹层与转场**
- 弹层一律底部弹出（`components/mobile/BottomSheet`，基于 Sheet side=bottom）：圆角顶 16px、拖拽把手、`pb-safe`、max-h 92svh 内滚；桌面保持居中 Dialog，不做左右侧滑抽屉。
- 路由转场按 `meta.level` 方向化：下钻 `slide-forward`、返回 `slide-back`（280ms，`cubic-bezier(0.32,0.72,0,1)`），tab 平级 `tab-fade`；进出同时渲染，离场元素绝对定位。`prefers-reduced-motion` 下全部降级为瞬时。
- 语言切换等 2 态分段选择用 `SegmentedTabs`（iOS 分段控件观感），桌面保持 Tabs。

**触摸**
- 触屏上去掉 tap 高亮（`-webkit-tap-highlight-color`），可点元素加 `.pressable`（按压 0.97 缩放）替代 hover；自定义滚动条在 `pointer: coarse` 下隐藏。
- 输入控件移动端字号 ≥16px（shadcn 组件已是 `text-base md:text-sm`），避免 iOS 聚焦自动放大。
- 背题卡片翻开后支持滑动评分（右=会 / 上=模糊 / 左=不会，`useSwipe` 仅触屏生效），按钮与键盘（1/2/3）并存。
- 题目详情为卡片堆叠（`QuestionDetailLayer`）：左滑下一题、右滑上一题，实时跟手拖拽（阈值 72px 或快速轻扫）；`pre/table` 内的横滑保留给横向滚动，垂直滚动始终原生（`touch-action: pan-y`）。

**视觉例外**
- 移动端卡片去描边、圆角升为 `rounded-2xl`、改用 `shadow-xs` 浅阴影（`Card` 组件内置响应式双形态）；列表行高 ≥44px 触摸目标。
- PWA：manifest + maskable 图标 + 动态 `theme-color`（`useTheme` 同步亮暗两值）；生产构建 SW 预缓存全部数据 JSON（约 11.5MB）实现离线刷题。

## 动效

- 页面切换 200ms、翻卡 160ms，只动 `opacity` 与 `transform`。
- `prefers-reduced-motion` 下全局降级为瞬时切换，状态变化本身保留。

## 讲义图示的步进演示（sequence）

`src/lib/stepPlayer.ts` 是与框架无关的播放引擎，`useStepPlayer` 只做 Vue 桥接，`LessonDiagram.vue` 只渲染派生状态：

- **数据层**：`steps[].events[]` 展平成一条事件流。教学步骤与消息是多对一（一张 Kafka 图 = 5 步 / 11 条消息），播放单位是 event，不是 step 也不是 packet。课程作者只在分组起点写 `step`，后续消息继承；`quick` / `duration` / `hold` / `tag` 均为可选。
- **状态层**：只有 `cursor` 一个游标，`derive()` 纯函数派生 `activeStep / stepPhases / itemPhases`；控制条、步骤条、列表、泳道、详情条全从同一状态渲染，通知用 microtask 合并。
- **时间层**：唯一时间源是 rAF 虚拟时钟（无 `setInterval` 递归）。暂停冻结累加、倍速作乘数、token 可取消；`jump / reset` 不重播，直接把已发生事件形变到终态。
- **节奏**：跨步骤停顿 > 普通事件 > 连续快包；`hold` 可覆盖。倍速存 `interview-trainer/player-speed`，并同步作用于注册的 WAAPI 动画。
- **视图**：列表 / 泳道两套渲染层共用游标；方向由 `from → to` 的 actor 下标推导，回程不另画一张图；分类色由 `tag`（缺省按 `reply`）统一编码编号圆点、行与箭头。
- **静读优先**：未开始时全部消息全量显示，不逼读者先点播放；开始后才分 past / current / future 三态。快捷键（空格 / ← → / V / Esc）只在图示聚焦时生效，不劫持整页阅读。

## 全站图解优先

`src/lib/timeline.ts` 把异构的「按先后发生」内容归一成一条事件流，同一套播放器服务 `sequence / flow / layers / state` 与 `principle.steps`；`LessonDiagram.vue` 只做分发，`diagram/DiagramPlayer.vue` 负责四区联动，`diagram/DiagramStatic.vue` 保留无时间序的静态快照。

- **默认折叠**：一课常有 3~4 张图，控制条默认收成一枚「播放演示」按钮；静读态全量显示、零 rAF 开销，点开才分 past / current / future 三态。
- **空间结构不播放**：集合包含 / 分类 / 左右对照 / 内存布局没有时间先后，`contain` 等静态图不接播放器，避免制造虚假因果顺序。
- **以图为主**：`LessonContent.vue` 把图示 / 表格 / 代码 / 步骤 / 要点提到标题正下方，解释性正文交给 `TextAnnotation.vue` 降为 13px 注解，首段常显、其余进原生 `<details>`。课时级「本课地图」排在导语之前，导语同样走注解封装（`lead` 只把首段放大到 14px），保证窄视口首屏先见结构。
- **不删文字**：正文始终留在 DOM 里，构建期字数下限与题目覆盖率不受影响；课时头「图解 / 全文精读」开关存 `interview-trainer/lesson-text-mode`，默认图解。
- **零新增字段**：判断只看 `diagram.type` 与 `block.kind`，作者源不必为播放能力补数据；老课时不写 `steps` 也能播放，只是没有步骤条。
- **写作引导**：`scripts/curriculum/audit.mjs` 用 `process-no-diagram` / `long-body-no-structure` 两条不阻断警告提示后续写作；`visual-plan.mjs` 的 `questionGaps()` 另把「关联题没落点」计入改造优先级，避免图做完了却漏掉半张题库。
- **窄视口不横滚**：`RichText.vue` 的行内 `code` 统一 `overflow-wrap: anywhere`，`rate.NewLimiter(...)` 这类无空格长串在 375px 下折行而不是把整页撑出滚动条；375px 验收要求 `scrollWidth ≤ innerWidth`。

## 第二种演示：分解 → 连接

`principle.steps[]` 默认走线性步进播放；**当每一步都写了 `visual`**，该区块会多出第二种演示，两种视图用 tab 切换（默认展示新的拆解态）。

- **机制真的不同，不是换皮肤**。步进播放是「一条事件流 + 单一游标 + past/current/future 三态」；分解连接是「N 张空间上独立的阶段卡 → 逐段画链路 → 令牌沿链扫过」，没有 rAF 虚拟时钟、没有倍速、没有事件游标。几何在 `src/lib/stageAssemble.ts`（纯函数，可单测），渲染在 `diagram/StageAssemble.vue` + `diagram/StageGlyph.vue`，切换壳是 `diagram/PrincipleDemos.vue`。
- **分别可视化**：`visual.kind` 有 6 种形状（file / command / pipeline / interpreter / counter / chip），每种画法不同，不是同一张卡换标题；`input → output` 写清这一阶段的产物转变，`hint` 是一行短注解，`tone` 可选强调。
- **再连接**：`stageLinks()` 由卡片实测矩形算相邻连线（同行水平 / 同列竖直 / 跨行折返），`stroke-dashoffset` 逐段绘出；桌面 3 列、窄屏 1 列自动换形，折线始终走在卡片间隙里，不压住内容。
- **静读优先**：默认拆解态纯静态，零定时器、零动画；「连接」「跑一遍」「重置」全由读者触发。`prefers-reduced-motion` 直接跳到终态。
- **不删文字**：6 段 `step.detail` 收进原生 `<details>`，全文精读时自动展开，与全站注解口径一致。
- **数据即开关**：老课时不写 `visual` 就完全不渲染 tab，行为逐字不变；写就必须每一步都写，构建期会拦下漏写与非法 `kind`。

判据：**既要讲清「每一步各自是什么」，又要讲清「它们怎么接起来」**，才值得上第二种演示。只有单一因果链时线性播放器已经够用；只有空间包含关系时用 `contain` 静态图。

## 图解化讲义写作规范

上一节改的是渲染层；这一节约束**作者源怎么写**。样板课是 `java-lang-collections/lang-jvm`（作者源 `scripts/curriculum/java/lang-collections.mjs`），它同时示范「图解化」与「题目地图 + 概念线/机制线双主线的全题库覆盖」两种写法；后续逐课改造按同一口径推进，待办清单由 `npm run courses:visual-plan` 生成。

### 一条原则

**一个教学动作 = 一个结构化承载 + 至多两段注解。** 先想「这个知识点该用哪张图 / 表 / 卡片讲」，再决定要不要写正文；正文只负责读图引导和补边界，不复述图里已经画出来的东西。判断标准很直接：把 `body` 整段删掉，读者还能不能从结构里看懂。

### 字段速查（不新增区块字段）

只用 `scripts/curriculum/schema.mjs` 已有的 10 种区块，不为图解化新增任何**区块**字段。图示共 10 种；`contain` 是专门补上的静态嵌套包含图，复用 `items[]` 的 `label / note / tone` 形状，另加可选 `base` 表示「不在包含链内」的外部底座：

| 要表达什么 | 用哪个既有字段 | 页面上的样子 |
|---|---|---|
| 现象 / 现场数据 | `why.code { language, caption, code }`、`diagram: scale` | 等宽现场卡、量级条形图 |
| 常见错解 | `why.wrong[]` | 「先排除几种容易被想到的原因」列表 |
| 真正的原因 | `why.real` + `why.reveal` | 主色高亮卡 + 揭示 |
| 反证 / 代价 | `why.without` | 「反过来说」虚线卡 |
| 术语定义 | `concept.term { name, def }` | 左侧主色术语卡 |
| 并列结论 | `concept.points[]` | 要点列表 |
| 有先后的机制 | `principle.steps[]` + `takeaway` | 步进播放器（自动获得）；每步补 `visual` 则多出「分解连接」演示 |
| 类比与映射 | `analogy.text / mapping[] / limit` | 对照表 |
| 有先后的链路 / 时序 / 状态 | `diagram: flow / state / sequence` | 步进播放器（自动获得） |
| 集合包含 / 谁套着谁 | `diagram: contain` + 可选 `base` | 静态嵌套框，**不播放** |
| 并排分层 / 堆叠顺序 | `diagram: layers` | 分层快照（可逐层演示） |
| 空间快照 / 左右对照 | `diagram: tree / matrix / memory / split / scale` | 静态图 |
| 多方案取舍 | `compare.head / rows / note / caption` | 表格 |
| 一句话结论 | `concept.caption`、`principle.takeaway`、`diagram.caption` | 结论条 |

图示说明必须写在 `diagram.caption`；`block.caption` 不会被 `LessonDiagram.vue` 渲染。`scale` 的 caption 要含「示意 / 非实测」。

### 三条硬规则

1. **单区块 `body` ≤ 2 段、合计 ≤ 180 字**。第 2 段起进入 `<details>` 注解；超过就拆成 `points` / `steps` / 新图 / `compare`，不要靠删句子硬压。
2. **不许连着三块纯文字**。`audit.mjs` 的 `text-run-no-anchor` 会对连续 3 个无视觉锚点的区块报一次；锚点口径见导出的 `hasVisualAnchor()`，教学审计与改造脚本共用同一实现。
3. **过程必须能走，空间结构不许走**。讲「为什么 / 怎么发生」的课，至少要有一张 `flow / layers / state / sequence` 或一段 `principle.steps`，让「播放演示」把因果按时间展开；`process-no-diagram` 盯着这条。反过来，集合包含、分类、左右对照、内存布局这些**没有先后**的结构，用 `contain / tree / matrix / memory / split / scale` 静态呈现——逐步播放会凭空制造因果顺序（典型反例：把 JDK ⊃ JRE ⊃ JVM 演成「第一步 JDK、第二步 JRE」）。

判据很简单：**把顺序打乱还成立吗？** 成立就是空间结构，用静态图；不成立才是过程，才接播放器。同一条因果链若还想强调「每段各自做了什么、产物怎么传下去」，可以叠加第二种演示（见「分解 → 连接」）——两种演示互补，不是二选一。

4. **关联题库必须全部有落点，而且知识点真讲了**。`questionIds` 里的每道题，要么有 `question` 真题拆解块，要么在图注 / 要点 / 收口里显式写出题号；答案要点要搬进结构化承载，不能只在索引里挂个号。课时开头放一张 `compare` **题目地图**（题号 / 问什么 / 讲义落点），把覆盖面一眼摆出来，并按「**Java 是什么 → 它怎么跑起来**」这类概念线 / 机制线分组，别让某一类题吃掉整课。`lang-jvm` 的教训就是 15 个区块里 13 个在讲 JIT / AOT，Q2 语言特点、Q5 与 C++ 区别、Q6 发行版与 LTS 整题没出现。

覆盖面的判据同样直接：**把 `questionIds` 逐题念一遍，能不能立刻指到某个区块？** 指不到就是缺口；题号出现在索引里但答案要点没写，仍然算缺口，`--lesson` 明细只是最低门槛。

### 改造检查清单

- [ ] `npm run courses:check` 通过：区块 5–20、正文 ≥1100（图示文字也计入）、单区块 ≥60
- [ ] `questionIds` 与 `question` 区块的 `questionId` 一字不改，题目覆盖 100%
- [ ] `npm run courses:visual-plan -- --lesson <id>` 显示「题目落点 N/N ✓」、分数 0；**逐题对照题库答案要点**，确认不是只标了题号
- [ ] 课时开头有题目地图，概念线 / 机制线都有独立区块，不出现「半节课只讲一类题」
- [ ] `npm run courses:check -- --audit` 里本课零告警（至少零 `long-body-no-structure` / `text-run-no-anchor` / `process-no-diagram`）
- [ ] 正文 `body` 总量明显下降，知识点都搬进了结构化字段（对照改造前的 `git diff`）
- [ ] 每张图都有 `diagram.caption`；`scale` 声明「示意」
- [ ] 每课图示控制在 6 张以内：图解化会降文字密度但拉长页面，`lang-jvm` 5883px → 图解化 7698px → 补齐 8 题 10491px（后一次 +36%，来自 5 个结构化区块）。页面过长时优先合并同类表格，不要靠删题目压长度
- [ ] 桌面 1280×900 与移动 375×812 各验一遍：控制条默认折叠、可播放、`scrollWidth ≤ innerWidth`
- [ ] 图解 / 全文精读 / 切回图解三态下 `Σ details.textContent.length` 恒等，控制台 0 错误

## 可访问性

- 所有输入控件必须有程序化名称（`aria-label` 或关联 `label`）；图标按钮必须有名称。
- 焦点样式统一使用 `--ring`，不移除浏览器焦点。
- 颜色不单独承载状态：文字始终同时给出「会 / 模糊 / 不会」。
- 正文与占位文字 ≥4.5:1，大号文字 ≥3:1。

## 数据

进度、课程完成度、AI 会话均存 `localStorage`；导出/导入为 JSON 备份，重置需二次确认。
