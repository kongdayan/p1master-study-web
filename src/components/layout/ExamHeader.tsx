import { BookOpenCheck, Clock, Target } from "lucide-react";
import { AuthPanel } from "@/components/layout/AuthPanel";
import { Badge } from "@/components/ui/badge";
import type { CloudAuthProviders, CloudUser, SyncStatus } from "@/types/cloud";
import type { ExamMeta } from "@/types/exam";

interface ExamHeaderProps {
  exam: ExamMeta;
  questionCount: number;
  user: CloudUser | null;
  providers: CloudAuthProviders;
  authLoading: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  onLogin: (provider: "google" | "apple") => void;
  onLogout: () => void;
}

export function ExamHeader({ exam, questionCount, user, providers, authLoading, syncStatus, syncError, lastSyncedAt, onLogin, onLogout }: ExamHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/95">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)] lg:items-start">
        <div className="min-w-0 lg:pr-4">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{exam.shortTitle}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-950 md:text-3xl">{exam.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{exam.description}</p>
        </div>
        <div className="grid min-w-0 gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Badge className="justify-center gap-1.5 py-2">
              <BookOpenCheck className="h-4 w-4" />
              {exam.passing.questions} 题考试
            </Badge>
            <Badge className="justify-center gap-1.5 py-2">
              <Clock className="h-4 w-4" />
              {exam.passing.durationMinutes / 60}h
            </Badge>
            <Badge className="justify-center gap-1.5 py-2">
              <Target className="h-4 w-4" />
              {exam.passing.passingQuestions} 题合格
            </Badge>
            <Badge className="justify-center py-2">{questionCount} 题库</Badge>
          </div>
          <AuthPanel
            user={user}
            providers={providers}
            loading={authLoading}
            syncStatus={syncStatus}
            syncError={syncError}
            lastSyncedAt={lastSyncedAt}
            onLogin={onLogin}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
}
