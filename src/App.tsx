import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ExamCatalog } from "@/components/catalog/ExamCatalog";
import { ExamHeader } from "@/components/layout/ExamHeader";
import { FriendlyMissingPage } from "@/components/layout/FriendlyMissingPage";
import { KnowledgeGraph } from "@/components/knowledge/KnowledgeGraph";
import { OutlineTab } from "@/components/outline/OutlineTab";
import { PracticeTab } from "@/components/practice/PracticeTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExamCatalog } from "@/hooks/useExamCatalog";
import { useExamData } from "@/hooks/useExamData";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { buildRouteUrl, parseRoute, type AppRoute, type AppView } from "@/lib/routing";
import { modulo } from "@/lib/utils";
import type { ExamCatalogItem } from "@/types/exam";

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute());
  const catalog = useExamCatalog();
  const { data, error, loading } = useExamData(route.examId);
  const progressApi = useStudyProgress(data?.exam.id || route.examId || "catalog", data?.questions || []);

  const currentQuestionNumber = useMemo(() => {
    if (route.view !== "practice" || !progressApi.filteredQuestions.length) return null;
    const index = modulo(progressApi.practiceState.index, progressApi.filteredQuestions.length);
    return progressApi.filteredQuestions[index]?.numericId || null;
  }, [progressApi.filteredQuestions, progressApi.practiceState.index, route.view]);

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!data || route.view !== "practice" || !route.questionNumber) return;
    const index = data.questions.findIndex((question) => question.numericId === route.questionNumber);
    if (index < 0) return;
    const current = progressApi.practiceState;
    const alreadyThere =
      current.chapterId === "all" &&
      current.query === "" &&
      !current.wrongOnly &&
      data.questions[modulo(current.index, data.questions.length)]?.numericId === route.questionNumber;
    if (alreadyThere) return;
    progressApi.updatePracticeState({
      chapterId: "all",
      query: "",
      wrongOnly: false,
      index,
      selected: null,
      revealed: false
    });
  }, [data, progressApi, route.questionNumber, route.view]);

  useEffect(() => {
    if (route.view === "catalog") return;
    const nextRoute = {
      examId: route.examId,
      view: route.view,
      questionNumber: route.view === "practice" ? currentQuestionNumber : null
    };
    const nextUrl = buildRouteUrl(nextRoute);
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [currentQuestionNumber, route.examId, route.view]);

  function goHome() {
    const nextRoute: AppRoute = { examId: null, view: "catalog", questionNumber: null };
    setRoute(nextRoute);
    window.history.pushState(null, "", buildRouteUrl(nextRoute));
  }

  function openExam(exam: ExamCatalogItem) {
    const nextRoute: AppRoute = {
      examId: exam.id,
      view: exam.defaultView,
      questionNumber: exam.defaultView === "practice" ? 1 : null
    };
    setRoute(nextRoute);
    window.history.pushState(null, "", buildRouteUrl(nextRoute));
  }

  function setView(view: AppView) {
    const nextRoute = {
      examId: route.examId,
      view,
      questionNumber: view === "practice" ? currentQuestionNumber : null
    };
    setRoute(nextRoute);
    window.history.pushState(null, "", buildRouteUrl(nextRoute));
  }

  if (route.view === "catalog") {
    if (catalog.loading) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在整理考题大全...
        </main>
      );
    }
    if (catalog.error || !catalog.data) return <FriendlyMissingPage onGoHome={goHome} />;
    return <ExamCatalog catalog={catalog.data} onOpenExam={openExam} />;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载题库...
      </main>
    );
  }

  if (error || !data) {
    return <FriendlyMissingPage examId={route.examId} onGoHome={goHome} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ExamHeader exam={data.exam} questionCount={data.questions.length} showStats={route.view !== "outline"} />
      <main className="mx-auto max-w-7xl px-4 py-5">
        <Tabs value={route.view} onValueChange={(value) => setView(value as AppView)} className="grid gap-4">
          <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
            <TabsTrigger value="practice">刷题</TabsTrigger>
            <TabsTrigger value="outline">大纲</TabsTrigger>
            <TabsTrigger value="map">知识图谱</TabsTrigger>
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
            <KnowledgeGraph graph={data.knowledge} chapters={data.chapters} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
