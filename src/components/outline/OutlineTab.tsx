import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Chapter, ExamMeta, KnowledgeGraphData, Question } from "@/types/exam";

interface OutlineTabProps {
  exam: ExamMeta;
  chapters: Chapter[];
  graph: KnowledgeGraphData;
  questions: Question[];
}

export function OutlineTab({ exam, chapters, graph, questions }: OutlineTabProps) {
  const [sortMode, setSortMode] = useState<"chapter" | "priority">("chapter");
  const chapterCounts = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.chapterId] = (acc[question.chapterId] || 0) + 1;
    return acc;
  }, {});
  const sortedChapters = useMemo(
    () =>
      chapters
        .slice()
        .sort((a, b) => (sortMode === "priority" ? a.priority - b.priority : Number(a.id) - Number(b.id))),
    [chapters, sortMode]
  );

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>章节权重与刷题数量</CardTitle>
              <CardDescription>{exam.title}</CardDescription>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              <Button size="sm" variant={sortMode === "chapter" ? "default" : "ghost"} onClick={() => setSortMode("chapter")}>
                按章节
              </Button>
              <Button size="sm" variant={sortMode === "priority" ? "default" : "ghost"} onClick={() => setSortMode("priority")}>
                按优先级
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2 pr-3">优先级</th>
                <th className="py-2 pr-3">章节</th>
                <th className="py-2 pr-3">比重</th>
                <th className="py-2 pr-3">估计题数</th>
                <th className="py-2 pr-3">题库</th>
                <th className="py-2 pr-3">策略</th>
              </tr>
            </thead>
            <tbody>
              {sortedChapters.map((chapter) => (
                <tr key={chapter.id} className="border-b last:border-0">
                  <td className="py-3 pr-3 font-semibold">{chapter.priority}</td>
                  <td className="py-3 pr-3 font-semibold text-slate-900">{chapter.title}</td>
                  <td className="py-3 pr-3">{chapter.weight}</td>
                  <td className="py-3 pr-3">{chapter.estimatedQuestions}</td>
                  <td className="py-3 pr-3">{chapterCounts[chapter.id] || 0} 题</td>
                  <td className="py-3 pr-3 text-slate-600">{chapter.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        {sortedChapters.map((chapter) => {
          const detail = graph.details[chapter.nodeId];
          return (
            <Card key={chapter.id}>
              <CardHeader>
                <CardTitle>{chapter.title}</CardTitle>
                <CardDescription>{detail?.summary || chapter.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {(detail?.bullets || []).slice(0, 5).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
