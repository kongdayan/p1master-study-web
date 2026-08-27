import { Download, FileUp, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { modulo } from "@/lib/utils";
import { explainQuestion } from "@/services/llmExplain";
import type { Chapter, Question } from "@/types/exam";
import type { StudyProgress } from "@/types/progress";
import type { StudySettings } from "@/types/settings";

interface PracticeTabProps {
  examId: string;
  chapters: Chapter[];
  questions: Question[];
  filteredQuestions: Question[];
  progress: StudyProgress;
  settings: StudySettings;
  stats: { answered: number; correct: number; rate: number; wrong: number };
  updatePracticeState: (next: Partial<StudyProgress["practiceState"]>) => void;
  resetCurrentAnswer: () => void;
  answerQuestion: (question: Question, selected: Question["answer"], options: { removeWrongOnCorrect: boolean }) => void;
  toggleWrong: (questionId: string) => void;
  resetProgress: () => void;
  importProgress: (progress: StudyProgress) => void;
  markSeen: (question: Question) => void;
  onNavigateQuestion: (question: Question, index: number) => void;
}

export function PracticeTab({
  examId,
  chapters,
  questions,
  filteredQuestions,
  progress,
  settings,
  stats,
  updatePracticeState,
  resetCurrentAnswer,
  answerQuestion,
  toggleWrong,
  resetProgress,
  importProgress,
  markSeen,
  onNavigateQuestion
}: PracticeTabProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const explainAbortRef = useRef<AbortController | null>(null);
  const autoExplainKeyRef = useRef<string | null>(null);
  const requestExplanationRef = useRef(requestExplanation);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const state = progress.practiceState;
  const currentIndex = modulo(state.index, filteredQuestions.length);
  const currentQuestion = filteredQuestions[currentIndex];
  const currentSavedAnswer = currentQuestion ? progress.answerHistory[currentQuestion.id] : undefined;
  const visibleSavedAnswer = currentQuestion && !state.wrongOnly && !state.hiddenAnswers[currentQuestion.id] ? currentSavedAnswer : undefined;
  const selectedChapter = chapters.find((chapter) => chapter.id === state.chapterId);
  const scopeLabel = state.wrongOnly
    ? "错题本复盘"
    : selectedChapter
      ? `第 ${selectedChapter.id} 章：${selectedChapter.shortTitle}`
      : "全部章节";

  const chapterCounts = useMemo(() => questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.chapterId] = (acc[question.chapterId] || 0) + 1;
    return acc;
  }, {}), [questions]);

  async function requestExplanation(question: Question, selected: Question["answer"] | null) {
    explainAbortRef.current?.abort();
    const controller = new AbortController();
    explainAbortRef.current = controller;
    setExplainingId(question.id);
    setExplainError(null);
    setExplanations((current) => ({ ...current, [question.id]: "" }));
    try {
      await explainQuestion({
        question,
        selected,
        settings,
        signal: controller.signal,
        onToken: (token) => {
          setExplanations((current) => ({
            ...current,
            [question.id]: `${current[question.id] || ""}${token}`
          }));
        }
      });
    } catch (cause) {
      if (!controller.signal.aborted) setExplainError(cause instanceof Error ? cause.message : "解释生成失败");
    } finally {
      if (!controller.signal.aborted) setExplainingId(null);
    }
  }

  useEffect(() => {
    requestExplanationRef.current = requestExplanation;
  });

  useEffect(() => {
    if (!currentQuestion || !settings.autoExplainWrong || !settings.llmApiKey || !state.selected) return;
    if (state.selected === currentQuestion.answer) return;
    const key = `${currentQuestion.id}:${state.selected}:${currentSavedAnswer?.updatedAt || ""}`;
    if (autoExplainKeyRef.current === key) return;
    autoExplainKeyRef.current = key;
    void requestExplanationRef.current(currentQuestion, state.selected);
  }, [currentQuestion, currentSavedAnswer?.updatedAt, state.selected, settings.autoExplainWrong, settings.llmApiKey]);

  function selectChapter(chapterId: string) {
    updatePracticeState({ chapterId, index: 0, selected: null, revealed: false });
    resetCurrentAnswer();
  }

  function exportProgress() {
    const payload = { ...progress, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${examId}-progress.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        importProgress(JSON.parse(String(reader.result)) as StudyProgress);
      } catch {
        window.alert("导入失败，请选择本页面导出的 JSON 记录。");
      }
    });
    reader.readAsText(file);
  }

  function navigateByOffset(offset: number) {
    const nextIndex = modulo(currentIndex + offset, filteredQuestions.length);
    const nextQuestion = filteredQuestions[nextIndex];
    if (nextQuestion) onNavigateQuestion(nextQuestion, nextIndex);
  }

  function navigateRandom() {
    const nextIndex = Math.floor(Math.random() * filteredQuestions.length);
    const nextQuestion = filteredQuestions[nextIndex];
    if (nextQuestion) onNavigateQuestion(nextQuestion, nextIndex);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <Card className="order-2 lg:sticky lg:top-4 lg:order-1">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle>练习控制</CardTitle>
          <CardDescription>选择章节、搜索题目，或进入错题本复盘。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-4">
          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
              <span>章节范围</span>
              <span>{filteredQuestions.length} 题</span>
            </div>
            <div className="grid gap-2">
              <Button variant={state.chapterId === "all" ? "default" : "outline"} size="sm" className="justify-between" onClick={() => selectChapter("all")}>
                <span>全部章节</span>
                <span className="opacity-75">{questions.length}</span>
              </Button>
              {chapters.map((chapter) => (
                <Button
                  key={chapter.id}
                  variant={state.chapterId === chapter.id ? "default" : "outline"}
                  size="sm"
                  className="justify-between"
                  onClick={() => selectChapter(chapter.id)}
                >
                  <span className="truncate">第 {chapter.id} 章：{chapter.shortTitle}</span>
                  <span className="shrink-0 opacity-75">{chapterCounts[chapter.id] || 0}</span>
                </Button>
              ))}
            </div>
          </section>

          <section className="grid gap-2">
            <label className="text-xs font-bold text-slate-500" htmlFor="practice-search">搜索题目</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="practice-search"
                className="pl-9"
                type="search"
                value={state.query}
                onChange={(event) => updatePracticeState({ query: event.target.value, index: 0, selected: null, revealed: false })}
                placeholder="近因、经纪、3.6..."
              />
            </div>
          </section>

          <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700">
            <Checkbox checked={state.wrongOnly} onCheckedChange={(value) => updatePracticeState({ wrongOnly: value === true, index: 0, selected: null, revealed: false })} />
            <span>
              只看错题本
              <span className="block text-xs text-slate-500">进入后隐藏历史答案，按重新作答处理。</span>
            </span>
          </label>

          <section className="grid gap-2">
            <p className="text-xs font-bold text-slate-500">学习记录</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={exportProgress}>
                <Download className="h-4 w-4" />
                导出
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" />
                导入
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="col-span-2"
                onClick={() => {
                  if (window.confirm("确定清空刷题进度、答题记录和错题本吗？")) resetProgress();
                }}
              >
                <Trash2 className="h-4 w-4" />
                清空进度
              </Button>
              <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={(event) => handleImport(event.target.files?.[0])} />
            </div>
          </section>
        </CardContent>
      </Card>

      <main className="order-1 grid min-w-0 gap-3 lg:order-2">
        <section className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">当前练习</p>
              <h2 className="mt-1 truncate text-lg font-extrabold text-slate-950">{scopeLabel}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {state.query ? `已搜索：${state.query}` : state.wrongOnly ? "重做错题时不会预先显示历史答案。" : "选择选项即可记录进度。"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:min-w-[420px]">
              {[
                ["当前", `${filteredQuestions.length}`],
                ["已做", `${stats.answered}`],
                ["正确率", `${stats.rate}%`],
                ["错题", `${stats.wrong}`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-slate-500">{label}</p>
                  <p className="mt-0.5 text-base font-extrabold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {currentQuestion ? (
          <QuestionCard
            question={currentQuestion}
            index={currentIndex}
            total={filteredQuestions.length}
            chapterLabel={chapters.find((chapter) => chapter.id === currentQuestion.chapterId)?.shortTitle || `第 ${currentQuestion.chapterId} 章`}
            selected={state.selected}
            savedAnswer={visibleSavedAnswer}
            revealed={state.revealed}
            wrong={Boolean(progress.wrongQuestionIds[currentQuestion.id])}
            explanation={explanations[currentQuestion.id] || ""}
            explaining={explainingId === currentQuestion.id}
            explainError={explainError}
            settings={settings}
            onAnswer={(letter) => answerQuestion(currentQuestion, letter, { removeWrongOnCorrect: settings.autoRemoveWrongOnCorrect })}
            onPrev={() => navigateByOffset(-1)}
            onNext={() => navigateByOffset(1)}
            onRandom={navigateRandom}
            onReveal={() => {
              const showing = state.revealed || state.selected !== null || Boolean(visibleSavedAnswer);
              if (!showing) markSeen(currentQuestion);
              updatePracticeState({
                selected: null,
                revealed: !showing,
                hiddenAnswers: {
                  ...state.hiddenAnswers,
                  [currentQuestion.id]: showing
                }
              });
            }}
            onToggleWrong={() => toggleWrong(currentQuestion.id)}
            onExplain={() => void requestExplanation(currentQuestion, state.selected ?? visibleSavedAnswer?.selected ?? null)}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-slate-600">没有匹配题目。请调整章节、搜索词，或关闭“只看错题本”。</CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
