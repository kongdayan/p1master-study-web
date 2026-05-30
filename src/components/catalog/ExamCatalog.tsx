import { BookOpenCheck, Clock, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamCatalogData, ExamCatalogItem } from "@/types/exam";

interface ExamCatalogProps {
  catalog: ExamCatalogData;
  onOpenExam: (exam: ExamCatalogItem) => void;
}

export function ExamCatalog({ catalog, onOpenExam }: ExamCatalogProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center gap-2 text-teal-700">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-bold">Exam Hub</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-950 md:text-4xl">{catalog.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{catalog.description}</p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{exam.title}</CardTitle>
                    <CardDescription className="mt-1">{exam.direction}</CardDescription>
                  </div>
                  <Badge className={exam.status === "available" ? "border-teal-200 text-teal-800" : "border-amber-200 text-amber-700"}>
                    {exam.status === "available" ? "可刷题" : "筹备中"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm leading-6 text-slate-600">{exam.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                  <Badge className="justify-center gap-1.5 py-2">
                    <BookOpenCheck className="h-4 w-4" />
                    {exam.questionCount} 题
                  </Badge>
                  <Badge className="justify-center gap-1.5 py-2">
                    <Clock className="h-4 w-4" />
                    {exam.durationMinutes} 分钟
                  </Badge>
                  <Badge className="justify-center gap-1.5 py-2">
                    <Target className="h-4 w-4" />
                    {exam.passingQuestions} 题合格
                  </Badge>
                  <Badge className="justify-center py-2">{exam.passingScorePercent}%</Badge>
                </div>
                <Button className="mt-auto" disabled={exam.status !== "available"} onClick={() => onOpenExam(exam)}>
                  开始学习
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
