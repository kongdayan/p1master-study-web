# P1 Master Study Web

一个使用 React、TypeScript、Tailwind CSS 构建的 IIQE 试卷一学习工具，面向香港保险中介人资格考试（Insurance Intermediaries Qualifying Examination, IIQE）Paper 1：Principles and Practice of Insurance。

## 功能

- 知识图谱：按章节展示风险、法律原则、保险原则、监管、职业道德等知识点。
- 学习大纲：汇总考试结构、章节权重、高频考点和七天复习安排。
- 刷题模式：内置 913 道选择题，支持按章筛选、搜索、显示答案、随机题、错题本和本地进度持久化。
- 卡片模式：用主动回忆方式复习关键概念。
- 移动端适配：手机上刷题与大纲是独立 Tab，刷题视图专注显示题目和选项。
- 学习记录：刷题进度、答题历史、错题本与复习清单会保存在当前浏览器，并支持导出 / 导入 JSON 备份。
- 数据驱动：题库、章节、知识图谱、卡片和清单都从 `public/data/exams/iiqe-paper1/exam.json` 加载。
- 组件化：刷题、错题本、知识图谱、大纲、卡片和基础 UI 均已拆分为可复用组件。

## 题库 JSON

题库数据格式见 [docs/question-bank-schema.md](docs/question-bank-schema.md)。新增其他考试时，建议复制 `public/data/exams/iiqe-paper1/exam.json` 的结构，使用新的 `exam.id`、章节、题目和知识图谱数据。

## 本地预览

安装依赖并启动开发服务器：

```bash
npm install
npm run dev
```

然后访问：

```text
http://127.0.0.1:5173
```

构建静态文件：

```bash
npm run build
```

## 部署

线上地址：

```text
https://p1.hunao.online
```

这是纯静态站点，可部署到 Cloudflare Workers 静态资源、Cloudflare Pages、GitHub Pages、Netlify、Vercel 或任意静态文件服务器。

当前部署使用 Cloudflare Workers 静态资源加自定义域名：

```bash
npm run build
wrangler deploy --assets dist --domain p1.hunao.online
```

## 内容说明

本项目内容定位于 IIQE 试卷一的常见学习范围：风险及保险、法律原则、保险原则、保险公司的主要功能、香港保险业结构、规管架构、职业道德及其他相关问题。考试名称、范围和监管要求可能调整；真实应考前请以官方考试手册与最新监管资料为准。
