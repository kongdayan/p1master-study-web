# 题库 JSON 数据格式

本项目通过 `public/data/exams/{examId}/exam.json` 加载考试数据。前端只依赖 TypeScript 类型 `ExamData`，因此后续新增其他考试时，可以复用刷题、错题本、导入导出、知识图谱和大纲组件。

## 顶层结构

```ts
interface ExamData {
  schemaVersion: "exam-bank.v1";
  exam: ExamMeta;
  chapters: Chapter[];
  knowledge: KnowledgeGraphData;
  questions: Question[];
  flashcards: Flashcard[];
  checklist: ChecklistItem[];
}
```

## 题目结构

```ts
interface Question {
  id: string;
  numericId: number;
  chapterId: string;
  ref: string;
  prompt: string;
  options: Array<{
    letter: "A" | "B" | "C" | "D";
    text: string;
  }>;
  answer: "A" | "B" | "C" | "D";
  explanation?: string;
  tags: string[];
}
```

## 知识图谱结构

```ts
interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  details: Record<string, KnowledgeDetail>;
}
```

`nodes` 负责节点坐标、分组和显示名；`edges` 负责关系；`details` 负责右侧详情面板。节点的 `id` 必须能在 `details` 里找到同名条目，章节节点建议用 `chapter.nodeId` 关联。

## 进度存储

用户进度不会写回 JSON，而是按考试 ID 存在浏览器：

```text
study-progress:{examId}:v1
```

这让多个考试共享同一套组件时，错题本和刷题进度互不影响。导出记录会生成同样结构的 JSON，可在其他浏览器导入。
