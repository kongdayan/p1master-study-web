import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExamCatalog } from "@/components/catalog/ExamCatalog";
import { ExamHeader } from "@/components/layout/ExamHeader";
import { FriendlyMissingPage } from "@/components/layout/FriendlyMissingPage";
import { KnowledgeGraph } from "@/components/knowledge/KnowledgeGraph";
import { OutlineTab } from "@/components/outline/OutlineTab";
import { PracticeTab } from "@/components/practice/PracticeTab";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCloudAuth } from "@/hooks/useCloudAuth";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useExamCatalog } from "@/hooks/useExamCatalog";
import { useExamData } from "@/hooks/useExamData";
import { useStudySettings } from "@/hooks/useStudySettings";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { appPathname, buildRouteUrl, parseRoute, type AppRoute, type AppView } from "@/lib/routing";
import { modulo } from "@/lib/utils";
import { completeGoogleOAuth } from "@/services/cloudApi";
import type { ExamCatalogItem } from "@/types/exam";

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute());
  const catalog = useExamCatalog();
  const { data, error, loading } = useExamData(route.examId);
  const settingsApi = useStudySettings();
  const progressApi = useStudyProgress(data?.exam.id || route.examId || "catalog", data?.questions || []);
  const auth = useCloudAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [oauthCompleting, setOauthCompleting] = useState(() => window.location.pathname === "/api/auth/google/callback");
  const [oauthError, setOauthError] = useState<string | null>(null);

  const currentQuestionNumber = useMemo(() => {
    if (route.view !== "practice" || !progressApi.filteredQuestions.length) return null;
    const index = modulo(progressApi.practiceState.index, progressApi.filteredQuestions.length);
    return progressApi.filteredQuestions[index]?.numericId || null;
  }, [progressApi.filteredQuestions, progressApi.practiceState.index, route.view]);

  const cloudSync = useCloudSync({
    examId: data?.exam.id || route.examId || "catalog",
    user: auth.user,
    questions: data?.questions || [],
    progress: progressApi.progress,
    currentQuestionNumber,
    applyCloudSnapshot: progressApi.applyCloudSnapshot,
    clearSyncQueue: progressApi.clearSyncQueue,
    buildFullSyncChanges: progressApi.buildFullSyncChanges
  });

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (window.location.pathname !== "/api/auth/google/callback") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setOauthError("Google 回调缺少授权参数，请重新登录。");
      setOauthCompleting(false);
      return;
    }
    setOauthCompleting(true);
    completeGoogleOAuth(code, state)
      .then((result) => {
        window.location.replace(result.redirectPath || "/");
      })
      .catch((cause) => {
        setOauthError(cause instanceof Error ? cause.message : "Google 登录完成失败，请重新登录。");
        setOauthCompleting(false);
      });
  }, []);

  useEffect(() => {
    const normalizedPath = appPathname();
    if (normalizedPath === window.location.pathname) return;
    const nextUrl = buildRouteUrl(route);
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [route]);

  const updatePracticeStateRef = useRef(progressApi.updatePracticeState);
  useEffect(() => {
    updatePracticeStateRef.current = progressApi.updatePracticeState;
  });

  const handledRouteQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!data || route.view !== "practice" || !route.questionNumber) return;
    const routeKey = `${data.exam.id}:${route.questionNumber}`;
    if (handledRouteQuestionRef.current === routeKey) return;
    const index = data.questions.findIndex((question) => question.numericId === route.questionNumber);
    if (index < 0) return;
    handledRouteQuestionRef.current = routeKey;
    updatePracticeStateRef.current({
      chapterId: "all",
      query: "",
      wrongOnly: false,
      index,
      selected: null,
      revealed: false
    });
  }, [data, route.questionNumber, route.view]);

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

  function navigatePracticeQuestion(questionNumber: number, index: number, replace = false) {
    const nextRoute: AppRoute = {
      examId: route.examId,
      view: "practice",
      questionNumber
    };
    setRoute(nextRoute);
    const nextUrl = buildRouteUrl(nextRoute);
    if (replace) window.history.replaceState(null, "", nextUrl);
    else window.history.pushState(null, "", nextUrl);
    handledRouteQuestionRef.current = `${data?.exam.id || route.examId || ""}:${questionNumber}`;
    updatePracticeStateRef.current({
      index,
      selected: null,
      revealed: false
    });
    const question = data?.questions.find((item) => item.numericId === questionNumber);
    if (question) progressApi.markSeen(question);
  }

  const settingsDialog = (
    <SettingsDialog
      settings={settingsApi.settings}
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      onSave={settingsApi.updateSettings}
      onReset={settingsApi.resetSettings}
      user={auth.user}
      authLoading={auth.loading}
      providers={auth.providers}
      openrouterConnected={auth.providers.openrouter}
      syncStatus={cloudSync.status}
      syncError={cloudSync.error}
      lastSyncedAt={cloudSync.lastSyncedAt}
      onConnectOpenRouter={() => void auth.connectOpenRouter()}
      onDisconnectOpenRouter={() => void auth.disconnectOpenRouter()}
      onLogin={auth.login}
      onLogout={() => void auth.logout()}
      onRetrySync={() => void cloudSync.retry()}
    />
  );

  if (oauthCompleting || oauthError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-700">
        <div className="grid max-w-md gap-3 rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
          {oauthCompleting ? (
            <>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-700" />
              <h1 className="text-lg font-extrabold text-slate-950">正在完成 Google 登录</h1>
              <p className="text-sm leading-6 text-slate-600">马上把你带回刷题页面。</p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-extrabold text-slate-950">Google 登录没有完成</h1>
              <p className="text-sm leading-6 text-slate-600">{oauthError}</p>
              <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white" onClick={() => window.location.replace("/")}>
                回到首页
              </button>
            </>
          )}
        </div>
      </main>
    );
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
    return (
      <>
        <ExamCatalog
          catalog={catalog.data}
          user={auth.user}
          authLoading={auth.loading}
          syncStatus={cloudSync.status}
          syncError={cloudSync.error}
          lastSyncedAt={cloudSync.lastSyncedAt}
          onOpenExam={openExam}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {settingsDialog}
      </>
    );
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
    <>
      <div className="min-h-screen bg-slate-50">
        <ExamHeader
          exam={data.exam}
          questionCount={data.questions.length}
          user={auth.user}
          authLoading={auth.loading}
          syncStatus={cloudSync.status}
          syncError={cloudSync.error}
          lastSyncedAt={cloudSync.lastSyncedAt}
          onOpenSettings={() => setSettingsOpen(true)}
        />
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
                settings={settingsApi.settings}
                stats={progressApi.stats}
                updatePracticeState={progressApi.updatePracticeState}
                resetCurrentAnswer={progressApi.resetCurrentAnswer}
                answerQuestion={progressApi.answerQuestion}
                toggleWrong={progressApi.toggleWrong}
                resetProgress={progressApi.resetProgress}
                importProgress={progressApi.importProgress}
                markSeen={progressApi.markSeen}
                onNavigateQuestion={(question, index) => navigatePracticeQuestion(question.numericId, index)}
              />
            </TabsContent>
            <TabsContent value="outline">
              <OutlineTab chapters={data.chapters} graph={data.knowledge} questions={data.questions} />
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
          </Tabs>
        </main>
      </div>
      {settingsDialog}
    </>
  );
}

export default App;
