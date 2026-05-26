# P1 Master Study Web

一个面向《试卷一：保险原理及实务》复习的单页静态学习工具。

## 功能

- 知识图谱：按章节展示风险、法律原则、保险原则、监管、职业道德等知识点。
- 学习大纲：汇总考试结构、章节权重、高频考点和七天复习安排。
- 刷题模式：内置 913 道从题库文本结构化得到的选择题，支持按章筛选、搜索、显示答案、随机题和错题本。
- 卡片模式：用主动回忆方式复习关键概念。
- 移动端适配：手机上刷题与大纲是独立 Tab，刷题视图专注显示题目和选项。

## 本地预览

直接打开 `index.html` 即可使用。也可以启动一个本地静态服务器：

```bash
python3 -m http.server 8765
```

然后访问：

```text
http://localhost:8765
```

## 部署

线上地址：

```text
https://p1.hunao.online
```

这是纯静态站点，可部署到 Cloudflare Workers 静态资源、Cloudflare Pages、GitHub Pages、Netlify、Vercel 或任意静态文件服务器。

当前部署使用 Cloudflare Workers 静态资源加自定义域名：

```bash
mkdir -p /tmp/p1master-study-web-dist
cp index.html study-outline.md README.md /tmp/p1master-study-web-dist/
wrangler deploy --config /tmp/p1-worker-wrangler.toml --assets /tmp/p1master-study-web-dist --domain p1.hunao.online
```

## 内容说明

本项目内容基于本地提供的 `p1master.pdf` 与整理后的学习提纲生成。原始 PDF 未包含在仓库中。请仅在你拥有相应使用与发布权限的场景下部署或公开访问。
