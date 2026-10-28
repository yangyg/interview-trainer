# 面试刷题工作台(interview-trainer)

基于本目录上级的 **Java / Golang / AI / 架构设计面试题库 Markdown 文档** 构建的纯前端刷题应用。
其中「架构设计」是与语言无关的一册(系统设计、高可用、性能、一致性),适合配合任一语言分册使用。
数据在构建时解析为 JSON,运行时零解析;学习进度存于浏览器 localStorage,无需任何后端。

当前全库 **1421 题**:Java 889 · Golang 304(含 `golang/index.html` 精编 177 题去重合并)· AI 136 · 架构设计 92。

## 功能

- **学习路径(课程)**:14 门课 / 56 阶段 / 153 课时,按「由浅入深」分层。每课时 = 完整讲义(是什么 / 为什么 / 原理拆解 / 类比 / 图示 / 对比 / 真题拆解)+ 关联真题逐题自评;课时内题目全部自评过即完成并解锁下一课,阶段末有混合验收(掌握率达标算通过)。课程**100% 覆盖全库 1421 题**,首页有「继续上次课时」入口
- **题库浏览**:按语言(Java / Golang / AI / 架构设计)× 专题 × 章节 × 频率 × 难度 × 掌握状态筛选,题目详情含答案要点、追问链与来源链接
- **全文搜索**:`Ctrl+K` 全局命令面板 + 独立搜索页,支持中文关键词(minisearch,CJK 二元组分词)
- **背题卡片**:翻卡自评 会 / 模糊 / 不会,Leitner 盒式间隔重复(1/2/4/7/15/30 天),到期自动推送
- **模拟面试**:按范围随机抽题、每题限时、自评判分,错题自动进错题本
- **统计与错题本**:专题掌握度堆积图(ECharts)、21 天学习热力、薄弱专题、进度导出 / 导入 JSON
- **AI 助手**(题目详情页):AI 解读(原理展开/易错点/加分答法)、AI 追问演练(扮演面试官连续追问并点评)、自由提问;流式输出、可中断、对话按题目持久化。模型接入支持 OpenAI 兼容 / Anthropic / Gemini 三种协议,内置 DeepSeek / Kimi / 通义 / 智谱 / OpenRouter / Ollama / Claude / Gemini 预设,设置页可测试连接;密钥仅存本机浏览器
- **面经与资料**:各语言题库总览、真实面经汇编(17 家公司)、岗位画像与备考路线、岗位与就业方向分析
- **体验**:暗色模式(跟随系统 + 手动切换)、移动端底部导航与自适应、页面过渡与卡片微交互、README 高频榜深链直达题目

## 使用

```bash
cd app

# 1. 从上级目录的 java/ golang/ ai/ arch/ 文档生成题库数据
#    题数自检:Java 889 / Go 357(含精编 177)/ AI 136 / 架构 92;
#    Go 侧解析后自动去重(精编题吸收 md 专题近似重复题并合并来源,357 → 304)
npm run parse

# 2. 生成课程数据(选择器 → public/data/courses/)
#    已挂到 predev / prebuild,通常不必手动跑;校验用 npm run courses:check
npm run courses

# 3. 开发调试
npm run dev

# 或生产构建后本地预览
npm run build
npm run preview
```

浏览器打开提示的地址(默认 http://localhost:5173)。文档更新后重新执行 `npm run parse` 即可刷新数据。

## 数据源约定(上级目录)

```
interview/
├── java/     # Java 题库(### Qn. + 频率/难度 + 来源,11 专题 + README)
├── golang/   # Golang 题库(**Qn.** + 【要点答案】,5 专题 + 精编 index.html + 面经/岗位分析)
└── ai/       # AI/大模型/Agent 题库(Java 格式,7 专题 + README,2026-10)
```

- Java/AI 用 `### Qn.` 标题格式,Go 用加粗题干 + 【要点答案】格式,解析器分别适配并归一化
- 各 README 中的「最高频 N 题速查」表格会被抽取为首页高频榜,标题与题目一致时可深链直达
- 新增专题只需按格式添加 `NN-主题.md`,解析器按目录自动发现

## 技术栈

Vite + Vue 3 + TypeScript · Tailwind CSS v4 + shadcn-vue(Reka UI)· @lucide/vue 图标
Pinia · vue-router · ECharts · minisearch · dayjs / @vueuse/core
解析管线:Node 脚本 + marked + highlight.js(构建时预渲染答案 Markdown)

## 目录结构

```
app/
├── scripts/parse.mjs        # 文档解析:三套格式归一化 + 近似题去重 + 题数自检
├── scripts/build-courses.mjs # 课程构建:选择器 → 课程 JSON + 覆盖率校验
├── scripts/curriculum/      # 课程作者源(14 门课的选择器 + 手写讲义),按语言分目录
├── public/data/             # 解析产物(index.json + 每专题 JSON + docs/,已入库)
├── public/data/courses/     # 课程产物(index.json + 每门课 JSON,已入库)
└── src/
    ├── views/               # 首页 / 学习路径 / 课程详情 / 课时 / 浏览 / 搜索 / 背题 / 模考 / 统计 / 错题本 / 文档
    ├── stores/              # data(题库加载+检索) / progress(SRS+localStorage) / course(课程索引+完成度) / ai(模型配置+多协议流式对话)
    ├── components/          # 业务组件(侧边栏/底部导航/搜索面板/AI 面板)+ course/(课程卡片/阶段/讲义/练习)+ ui/(shadcn-vue 源码)
    └── lib/                 # 类型 / 语言识别色(langs) / SRS 规则 / 主导航源(nav) / 类名合并(utils) / ECharts 按需注册
```

## 课程体系

四层结构:**语言 → 课程 → 阶段 → 课时**。课程数据是构建产物,运行时只读 JSON。

- 课程数量与顺序由 `scripts/curriculum/index.mjs` 聚合,每门课一个文件,导出 `{ id, language, title, level, order, stages }`
- 课时用**选择器**声明题目来源,而不是手抄题号:
  ```js
  { id: 'hashmap', title: 'HashMap 底层结构', kind: 'concept',
    sources: [{ topic: 'java-02', chapters: ['五、HashMap'] }],
    exclude: ['java-02-Q31'],   // 可选:排除不适合本课的题
    order: 'frequency',          // source | no | frequency
    content: { intro: '…150-340 字…', outline: ['…'], pitfalls: ['…'] } }
  ```
- 章节匹配三级回退:精确 → 归一化全等(去 `第X章` / `一、` / `3.`,统一全半角与 `·・•`)→ 归一化唯一子串
- 构建期 fail-fast 校验:题号不存在、伪章节(来源清单/附录)、讲义字数越界、同课重复题、验收题越界、**覆盖率必须 100%**
- 阶段验收题按 `(频率×10 − 难度)` 自动抽取 8-15 题,`passRatio` 默认 0.8
- 内容指纹 `buildHash` 写进 `courses/index.json`;内容没变则不重写文件,避免无意义 diff

### 讲义结构(v2)

一节课的讲义不是提纲,而是按教学动作展开的区块序列,前端由 `LessonContent.vue` 统一渲染:

| 区块 | 作用 |
|---|---|
| `concept` | 是什么:定义 + 术语卡 + 要点 |
| `why` | 为什么需要它,附「没有它会怎样」的反证 |
| `principle` | 更深原理:有序步骤拆解机制,末尾一句收口 |
| `analogy` | 类比 + 现实物到技术物的映射表 + **类比的边界** |
| `diagram` | 结构化图示,9 种类型见下表,作者只写数据 |
| `compare` | 多方案对比表 |
| `code` | 代码片段 + 关键行讲解 |
| `handwrite` | 手写题:题干 → 方法签名 → 思路步骤 → 骨架(留 TODO) → 参考实现(折叠) → 复杂度 → 易错点 |
| `question` | 关联真题拆解:考官在筛什么 → 回答骨架 → 拉开分档的细节 → 追问怎么接 |

图示全部由 `LessonDiagram.vue` 用 div + Tailwind 渲染,不写 SVG,自动跟随亮暗主题:

| 类型 | 用在什么地方 |
|---|---|
| `flow` | 单向流程(编译链路、请求经过的组件) |
| `layers` | 堆叠分层(JDK⊃JRE⊃JVM、协议栈) |
| `tree` | 继承或组织结构 |
| `matrix` | 二维分类对照 |
| `memory` | 内存布局:分区 + 槽位 + 「指向 …」引用,讲对象、栈帧、常量池 |
| `sequence` | 时序:参与者 + 编号消息,`reply: true` 表示返回,讲类加载、CAS、HashMap 定位 |
| `split` | 左右对照,`tone` 取 bad/warn/good,讲错误写法 vs 正确写法 |
| `scale` | 量级条形(**对数比例**,跨数量级才看得出差异),讲复杂度与拷贝量 |
| `state` | 状态流转 + `back` 回退边,讲线程状态、JIT 编译层级 |

课后手写 `sections` 的一节课,构建期强制满足:**≥5 个区块(上限 20)、正文 ≥1100 字、必须含 `concept` + `principle` + 一个 `question`、且至少有一种 `analogy`/`diagram`/`compare`**;`handwrite` 还要求思路 ≥2 步、有参考实现、骨架里至少留一个 `TODO`。没写 `sections` 的老课时仍按旧规则校验,可以逐课升级。

课时时长不再是「题数 × 1.2」,而是按正文 320 字/分钟 + 每题 1.1 分钟估算。

课程完成度与 SRS 进度是**两套独立真源**:课时是否完成看 `course-v1`,复习间隔仍由 `progress-v1` 决定。

## AI 助手设置

- 入口:题目详情 → 「AI 助手」→ 设置;或面板内未配置引导
- 配置:供应商预设(自动填 baseUrl/模型)→ API Key → 「保存并测试连接」
- 兼容供应商:DeepSeek、Kimi、通义千问、智谱 GLM、OpenRouter、本地 Ollama(需 `OLLAMA_ORIGINS=*` 解决跨域)、Claude、Gemini,或任意 OpenAI 兼容端点
- 密钥与对话仅存本机浏览器 localStorage;AI 生成内容仅供参考

## 进度数据

- 存储:`localStorage["interview-trainer/progress-v1"]`(学习记录与每日统计)
- 课程课时完成度:`localStorage["interview-trainer/course-v1"]`(与 SRS 进度分开;重置进度时两者一起清空)
- 主题:`localStorage["interview-trainer/theme"]`(light / dark / system,与进度分开存放)
- AI 配置与对话:`interview-trainer/ai-config-v1`、`interview-trainer/ai-chats-v1`
- 备份:学习统计页 → 导出 / 导入 JSON;换浏览器前请先导出
