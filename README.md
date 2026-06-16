# Exam Study Hub

一个使用 React、TypeScript、Tailwind CSS 构建的可扩展考试刷题站。当前已上线香港保险中介人资格考试（Insurance Intermediaries Qualifying Examination, IIQE）Paper 1：Principles and Practice of Insurance。

## 功能

- 考题大全：首页展示不同考试的方向、题量、考试时间、合格线和入口。
- 知识图谱：按章节展示风险、法律原则、保险原则、监管、职业道德等知识点。
- 学习大纲：汇总考试结构、章节权重和高频考点。
- 刷题模式：内置 914 道选择题，支持按章筛选、搜索、显示答案、随机题、错题本和本地进度持久化。
- 移动端适配：手机上刷题与大纲是独立 Tab，刷题视图专注显示题目和选项。
- 学习记录：未登录时保存在当前浏览器；登录后可同步到 Cloudflare D1，并继续支持导出 / 导入 JSON 备份。
- 数据驱动：考试列表从 `public/data/exams/index.json` 加载，题库、章节、知识图谱和清单从对应考试的 `exam.json` 加载。
- 组件化：刷题、错题本、知识图谱、大纲和基础 UI 均已拆分为可复用组件。
- 可分享 URL：使用 `?exam=iiqe-paper1&view=practice&question=1` 区分考试、页面和题目。
- 友好兜底：不存在的考试会显示可爱的提示，并引导回考题大全。

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
https://exams.anserlabs.com
```

当前站点使用 Cloudflare Workers 静态资源 + Worker API + D1。静态资源仍由 Vite 构建，登录和云端进度由 `worker/index.ts` 提供。

当前部署使用 Cloudflare Workers 静态资源加自定义域名：

```bash
npm run build
wrangler deploy --domain exams.anserlabs.com --domain p1.anserlabs.com
```

旧域名 `https://p1.anserlabs.com` 仍可作为兼容入口。

## 云端同步配置

首次启用云端同步需要创建并迁移 D1：

```bash
wrangler d1 create p1master-study-web-db
wrangler d1 migrations apply p1master-study-web-db --remote
```

`wrangler.toml` 需要绑定名为 `DB` 的 D1 数据库。Google / Apple 登录通过以下 secrets 配置：

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put APPLE_CLIENT_ID
wrangler secret put APPLE_TEAM_ID
wrangler secret put APPLE_KEY_ID
wrangler secret put APPLE_PRIVATE_KEY
```

OAuth 回调地址：

```text
https://exams.anserlabs.com/api/auth/google/callback
https://exams.anserlabs.com/api/auth/apple/callback
```

Google 登录使用 Google Identity Services popup code flow。Google Cloud Console 中还需要配置 Authorized JavaScript origins：

```text
https://exams.anserlabs.com
```

## 内容说明

本项目内容定位于 IIQE 试卷一的常见学习范围：风险及保险、法律原则、保险原则、保险公司的主要功能、香港保险业结构、规管架构、职业道德及其他相关问题。考试名称、范围和监管要求可能调整；真实应考前请以官方考试手册与最新监管资料为准。
