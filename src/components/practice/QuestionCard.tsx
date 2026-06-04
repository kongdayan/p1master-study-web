import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChoiceLetter, Question } from "@/types/exam";
import type { AnswerRecord } from "@/types/progress";
import type { StudySettings } from "@/types/settings";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  chapterLabel: string;
  selected: ChoiceLetter | null;
  savedAnswer?: AnswerRecord;
  revealed: boolean;
  wrong: boolean;
  explanation: string;
  explaining: boolean;
  explainError: string | null;
  settings: StudySettings;
  onAnswer: (letter: ChoiceLetter) => void;
  onPrev: () => void;
  onNext: () => void;
  onRandom: () => void;
  onReveal: () => void;
  onToggleWrong: () => void;
  onExplain: () => void;
}

export function QuestionCard({
  question,
  index,
  total,
  chapterLabel,
  selected,
  savedAnswer,
  revealed,
  wrong,
  explanation,
  explaining,
  explainError,
  settings,
  onAnswer,
  onPrev,
  onNext,
  onRandom,
  onReveal,
  onToggleWrong,
  onExplain
}: QuestionCardProps) {
  const [explanationOpen, setExplanationOpen] = useState(false);
  const effectiveSelected = selected ?? savedAnswer?.selected ?? null;
  const answered = effectiveSelected !== null || revealed;
  const correct = effectiveSelected === question.answer;
  const answerOption = question.options.find((option) => option.letter === question.answer);

  useEffect(() => {
    setExplanationOpen(false);
  }, [question.id]);

  useEffect(() => {
    if (explaining || explanation) setExplanationOpen(true);
  }, [explaining, explanation]);

  return (
    <Card>
      <CardContent className="grid gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          <Badge>第 {index + 1} / {total} 题</Badge>
          <Badge>{chapterLabel}</Badge>
          <Badge>参考章节 {question.ref}</Badge>
          {wrong ? <Badge className="border-red-200 text-red-700">错题本</Badge> : null}
        </div>
        <h2 className="text-lg font-bold leading-8 text-slate-950">{question.prompt}</h2>
        <div className="grid gap-2">
          {question.options.map((option) => {
            const isCorrect = answered && option.letter === question.answer;
            const isWrong = effectiveSelected === option.letter && option.letter !== question.answer;
            return (
              <button
                key={option.letter}
                className={cn(
                  "flex min-h-12 w-full items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-sm leading-6 transition hover:border-teal-700",
                  isCorrect && "border-green-600 bg-green-50",
                  isWrong && "border-red-600 bg-red-50"
                )}
                onClick={() => onAnswer(option.letter)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500">
                  {option.letter}
                </span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
        {answered ? (
          <div className="rounded-r-lg border-l-4 border-teal-700 bg-teal-50 px-3 py-2 text-sm leading-6 text-slate-700">
            {effectiveSelected ? (correct ? "答对了。" : `答错了，你选的是 ${effectiveSelected}。`) : "已显示答案。"}
            {" "}正确答案是 {question.answer}：{answerOption?.text}
          </div>
        ) : null}
        {answered ? (
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">题目解释</h3>
                <p className="text-xs text-slate-500">
                  {!settings.llmApiKey ? "请先在配置里填写 API Key。" : explaining ? "正在流式生成解释..." : explanation ? "解释已生成，可展开查看。" : "用你配置的模型解释答案逻辑。"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {explanation || explaining || explainError ? (
                  <Button size="sm" variant="ghost" onClick={() => setExplanationOpen((open) => !open)}>
                    {explanationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {explanationOpen ? "收起" : "展开"}
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={onExplain} disabled={explaining || !settings.llmApiKey}>
                  {explaining ? "解释中" : explanation ? "重新解释" : "解释本题"}
                </Button>
              </div>
            </div>
            {explanationOpen && explainError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{explainError}</p> : null}
            {explanationOpen && explanation ? (
              <div className="question-explanation rounded-md bg-slate-50 px-3 py-2 text-sm leading-7 text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" onClick={onPrev}>上一题</Button>
          <Button variant="outline" onClick={onNext}>下一题</Button>
          <Button variant="outline" onClick={onRandom}>随机题</Button>
          <Button variant="outline" onClick={onReveal}>{answered ? "隐藏答案" : "显示答案"}</Button>
          <Button variant={wrong ? "danger" : "outline"} onClick={onToggleWrong}>
            {wrong ? "移出错题本" : "加入错题本"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
