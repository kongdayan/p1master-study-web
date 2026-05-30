import { Loader2 } from "lucide-react";
import { ExamHeader } from "@/components/layout/ExamHeader";
import { FlashcardsTab } from "@/components/flashcards/FlashcardsTab";
import { KnowledgeGraph } from "@/components/knowledge/KnowledgeGraph";
import { OutlineTab } from "@/components/outline/OutlineTab";
import { PracticeTab } from "@/components/practice/PracticeTab";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExamData } from "@/hooks/useExamData";
import { useStudyProgress } from "@/hooks/useStudyProgress";

function App() {
  const { data, error, loading } = useExamData("iiqe-paper1");
  const progressApi = useStudyProgress(data?.exam.id || "iiqe-paper1", data?.questions || []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载题库...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-sm leading-6 text-slate-600">
            题库加载失败。请刷新页面，或检查 `/data/exams/iiqe-paper1/exam.json` 是否存在。
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ExamHeader exam={data.exam} questionCount={data.questions.length} />
      <main className="mx-auto max-w-7xl px-4 py-5">
        <Tabs defaultValue="practice" className="grid gap-4">
          <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
            <TabsTrigger value="practice">刷题</TabsTrigger>
            <TabsTrigger value="outline">大纲</TabsTrigger>
            <TabsTrigger value="map">知识图谱</TabsTrigger>
            <TabsTrigger value="cards">卡片</TabsTrigger>
          </TabsList>
          <TabsContent value="practice">
            <PracticeTab
              examId={data.exam.id}
              chapters={data.chapters}
              questions={data.questions}
              filteredQuestions={progressApi.filteredQuestions}
              progress={progressApi.progress}
              stats={progressApi.stats}
              updatePracticeState={progressApi.updatePracticeState}
              resetCurrentAnswer={progressApi.resetCurrentAnswer}
              answerQuestion={progressApi.answerQuestion}
              toggleWrong={progressApi.toggleWrong}
              resetProgress={progressApi.resetProgress}
              importProgress={progressApi.importProgress}
            />
          </TabsContent>
          <TabsContent value="outline">
            <OutlineTab exam={data.exam} chapters={data.chapters} graph={data.knowledge} questions={data.questions} />
          </TabsContent>
          <TabsContent value="map">
            <KnowledgeGraph
              graph={data.knowledge}
              chapters={data.chapters}
              checklist={data.checklist}
              checked={progressApi.progress.checklist}
              onChecklistChange={progressApi.setChecklistItem}
            />
          </TabsContent>
          <TabsContent value="cards">
            <FlashcardsTab cards={data.flashcards} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
