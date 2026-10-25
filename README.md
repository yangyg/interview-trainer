# 面试刷题工作台(interview-trainer)

基于本目录上级的 **Java / Golang 面试题库 Markdown 文档** 构建的纯前端刷题应用。
数据在构建时解析为 JSON,运行时零解析;学习进度存于浏览器 localStorage,无需任何后端。

## 功能

- **题库浏览**:按语言 / 专题 / 章节 / 频率 / 难度 / 掌握状态筛选,题目详情含答案要点与来源链接
- **全文搜索**:`Ctrl+K` 全局命令面板 + 独立搜索页,支持中文关键词(minisearch,CJK 二元组分词)
- **背题卡片**:翻卡自评 会 / 模糊 / 不会,Leitner 盒式间隔重复(1/2/4/7/15/30 天),到期自动推送
- **模拟面试**:按范围随机抽题、每题限时、自评判分,错题自动进错题本
- **统计与错题本**:专题掌握度堆积图(ECharts)、21 天学习热力、薄弱专题、进度导出 / 导入 JSON
- **面经资料**:README 总览、真实面经汇编(17 家公司)、岗位与就业方向分析,整卷阅读
- 暗色模式(跟随系统 + 手动切换)、移动端适配

## 使用

```bash
cd app

# 1. 从上级目录的 java/ golang/ 文档生成题库数据(题数自检:Java 889 / Go 357,含 golang/index.html 精编 177 题;随后自动去重——精编题吸收 md 专题中的近似重复题,合并来源链接,当前去重后共 1193 题)
npm run parse

# 2. 开发调试
npm run dev

# 或生产构建后本地预览
npm run build
npm run preview
```

浏览器打开提示的地址(默认 http://localhost:5173)。文档更新后重新执行 `npm run parse` 即可刷新数据。

## 技术栈

Vite + Vue 3 + TypeScript · Tailwind CSS v4 + shadcn-vue(Reka UI)· @lucide/vue 图标
Pinia · vue-router · ECharts · minisearch · dayjs / @vueuse/core
解析管线:Node 脚本 + marked + highlight.js(构建时预渲染答案 Markdown)

## 目录结构

```
app/
├── scripts/parse.mjs        # 文档解析:两套格式归一化 + 题数自检
├── public/data/             # 解析产物(index.json + 每专题 JSON + docs/)
└── src/
    ├── views/               # 首页 / 浏览 / 搜索 / 背题 / 模考 / 统计 / 错题本 / 文档
    ├── stores/              # data(题库懒加载+检索) / progress(SRS+localStorage)
    ├── components/          # 业务组件 + ui/(shadcn-vue 源码组件)
    └── lib/                 # 类型 / SRS 规则 / ECharts 按需注册
```

## 进度数据

- 存储:`localStorage["interview-trainer/progress-v1"]`
- 备份:学习统计页 → 导出 / 导入 JSON;换浏览器前请先导出
