import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Chapter, ExamMeta, KnowledgeGraphData, Question } from "@/types/exam";

interface OutlineTabProps {
  exam: ExamMeta;
  chapters: Chapter[];
  graph: KnowledgeGraphData;
  questions: Question[];
}

export function OutlineTab({ exam, chapters, graph, questions }: OutlineTabProps) {
  const chapterCounts = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.chapterId] = (acc[question.chapterId] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 md:grid-cols-4">
        <Badge className="justify-center py-2">{exam.passing.questions} 题考试</Badge>
        <Badge className="justify-center py-2">{exam.passing.durationMinutes} 分钟</Badge>
        <Badge className="justify-center py-2">{exam.passing.passingScorePercent}% 合格</Badge>
        <Badge className="justify-center py-2">题库 {questions.length} 题</Badge>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>章节权重与刷题数量</CardTitle>
          <CardDescription>后续更换考试时，只要替换 JSON 数据包即可复用这套展示。</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>七天复习安排</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid list-decimal gap-2 pl-5 text-sm leading-6 text-slate-600">
            <li>第 1 章 + 第 5 章：建立基础概念，完成低权重章节。</li>
            <li>第 2 章合约法：背熟简单合约要素与例子。</li>
            <li>第 2 章代理法：掌握代理权限、责任、终止。</li>
            <li>第 3 章上半：可保权益、最高诚信、近因。</li>
            <li>第 3 章下半：彌偿、分担、代位。</li>
            <li>第 4、6、7 章：部门职责、监管机构、合规问题。</li>
            <li>75 题 / 2 小时模拟训练，错题回到刷题模式复盘。</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
