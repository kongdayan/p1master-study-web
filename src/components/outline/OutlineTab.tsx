import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Chapter, KnowledgeGraphData, Question } from "@/types/exam";

interface OutlineTabProps {
  chapters: Chapter[];
  graph: KnowledgeGraphData;
  questions: Question[];
}

export function OutlineTab({ chapters, graph, questions }: OutlineTabProps) {
  const chapterCounts = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.chapterId] = (acc[question.chapterId] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>章节权重与刷题数量</CardTitle>
          <CardDescription>按章节查看考试范围、权重和高频复习策略。</CardDescription>
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
              {chapters
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((chapter) => (
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
        {chapters
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((chapter) => {
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
