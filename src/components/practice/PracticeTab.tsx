import { Download, FileUp, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { modulo } from "@/lib/utils";
import type { Chapter, Question } from "@/types/exam";
import type { StudyProgress } from "@/types/progress";

interface PracticeTabProps {
  examId: string;
  chapters: Chapter[];
  questions: Question[];
  filteredQuestions: Question[];
  progress: StudyProgress;
  stats: { answered: number; correct: number; rate: number; wrong: number };
  updatePracticeState: (next: Partial<StudyProgress["practiceState"]>) => void;
  resetCurrentAnswer: () => void;
  answerQuestion: (question: Question, selected: Question["answer"]) => void;
  toggleWrong: (questionId: string) => void;
  resetProgress: () => void;
  importProgress: (progress: StudyProgress) => void;
}

export function PracticeTab({
  examId,
  chapters,
  questions,
  filteredQuestions,
  progress,
  stats,
  updatePracticeState,
  resetCurrentAnswer,
  answerQuestion,
  toggleWrong,
  resetProgress,
  importProgress
}: PracticeTabProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const state = progress.practiceState;
  const currentIndex = modulo(state.index, filteredQuestions.length);
  const currentQuestion = filteredQuestions[currentIndex];

  const chapterCounts = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.chapterId] = (acc[question.chapterId] || 0) + 1;
    return acc;
  }, {});

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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge>题库 {questions.length} 题</Badge>
        <Badge>当前 {filteredQuestions.length} 题</Badge>
        <Badge>已做 {stats.answered} 题</Badge>
        <Badge>正确率 {stats.rate}%</Badge>
        <Badge>错题 {stats.wrong} 题</Badge>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button variant={state.chapterId === "all" ? "default" : "outline"} size="sm" onClick={() => selectChapter("all")}>
              全部 {questions.length}
            </Button>
            {chapters.map((chapter) => (
              <Button
                key={chapter.id}
                variant={state.chapterId === chapter.id ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => selectChapter(chapter.id)}
              >
                第 {chapter.id} 章 {chapterCounts[chapter.id] || 0}
              </Button>
            ))}
          </div>
          <Input
            type="search"
            value={state.query}
            onChange={(event) => updatePracticeState({ query: event.target.value, index: 0, selected: null, revealed: false })}
            placeholder="搜索题干、选项或参考章节，例如 3.6、近因、经纪"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox checked={state.wrongOnly} onCheckedChange={(value) => updatePracticeState({ wrongOnly: value === true, index: 0 })} />
            只看错题本
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportProgress}>
              <Download className="h-4 w-4" />
              导出记录
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileUp className="h-4 w-4" />
              导入记录
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("确定清空刷题进度、答题记录和错题本吗？")) resetProgress();
              }}
            >
              <Trash2 className="h-4 w-4" />
              清空进度
            </Button>
            <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={(event) => handleImport(event.target.files?.[0])} />
          </div>
        </CardContent>
      </Card>

      {currentQuestion ? (
        <QuestionCard
          question={currentQuestion}
          index={currentIndex}
          total={filteredQuestions.length}
          chapterLabel={chapters.find((chapter) => chapter.id === currentQuestion.chapterId)?.shortTitle || `第 ${currentQuestion.chapterId} 章`}
          selected={state.selected}
          savedAnswer={state.hiddenAnswers[currentQuestion.id] ? undefined : progress.answerHistory[currentQuestion.id]}
          revealed={state.revealed}
          wrong={Boolean(progress.wrongQuestionIds[currentQuestion.id])}
          onAnswer={(letter) => answerQuestion(currentQuestion, letter)}
          onPrev={() => updatePracticeState({ index: modulo(currentIndex - 1, filteredQuestions.length), selected: null, revealed: false })}
          onNext={() => updatePracticeState({ index: modulo(currentIndex + 1, filteredQuestions.length), selected: null, revealed: false })}
          onRandom={() => updatePracticeState({ index: Math.floor(Math.random() * filteredQuestions.length), selected: null, revealed: false })}
          onReveal={() => {
            const showing = state.revealed || state.selected !== null || Boolean(progress.answerHistory[currentQuestion.id] && !state.hiddenAnswers[currentQuestion.id]);
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
        />
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">没有匹配题目。请调整章节、搜索词，或关闭“只看错题本”。</CardContent>
        </Card>
      )}

      <p className="text-xs leading-5 text-slate-500">
        刷题进度、答题记录和错题本会按考试 ID 保存在当前浏览器；换设备时可用导出 / 导入迁移。
      </p>
    </div>
  );
}
