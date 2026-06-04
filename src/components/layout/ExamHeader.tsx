import { BookOpenCheck, Clock, Settings, Target } from "lucide-react";
import { useState } from "react";
import { AuthPanel } from "@/components/layout/AuthPanel";
import { StudySettingsDialog } from "@/components/settings/StudySettingsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CloudAuthProviders, CloudUser, SyncStatus } from "@/types/cloud";
import type { ExamMeta } from "@/types/exam";
import type { StudySettings } from "@/types/settings";

interface ExamHeaderProps {
  exam: ExamMeta;
  questionCount: number;
  settings: StudySettings;
  user: CloudUser | null;
  providers: CloudAuthProviders;
  authLoading: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  onUpdateSettings: (settings: Partial<StudySettings>) => void;
  onResetSettings: () => void;
  onRetrySync: () => void;
  onLogin: (provider: "google" | "apple") => void;
  onLogout: () => void;
}

export function ExamHeader({
  exam,
  questionCount,
  settings,
  user,
  providers,
  authLoading,
  syncStatus,
  syncError,
  lastSyncedAt,
  onUpdateSettings,
  onResetSettings,
  onRetrySync,
  onLogin,
  onLogout
}: ExamHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white/95">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,560px)] lg:items-start">
          <div className="min-w-0 lg:pr-4">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{exam.shortTitle}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-950 md:text-3xl">{exam.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{exam.description}</p>
          </div>
          <div className="grid min-w-0 gap-3 lg:justify-items-end">
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-[560px]">
              <Badge className="justify-center gap-1.5 py-2">
                <BookOpenCheck className="h-4 w-4" />
                {exam.passing.questions} 题考试
              </Badge>
              <Badge className="justify-center gap-1.5 py-2">
                <Clock className="h-4 w-4" />
                {exam.passing.durationMinutes} 分钟
              </Badge>
              <Badge className="justify-center gap-1.5 py-2">
                <Target className="h-4 w-4" />
                {exam.passing.passingScorePercent}% 合格
              </Badge>
              <Badge className="justify-center py-2">题库 {questionCount} 题</Badge>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:max-w-[560px] lg:justify-end">
              <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
                配置中心
              </Button>
              <AuthPanel
                user={user}
                providers={providers}
                loading={authLoading}
                syncStatus={syncStatus}
                syncError={syncError}
                lastSyncedAt={lastSyncedAt}
                onRetrySync={onRetrySync}
                onLogin={onLogin}
                onLogout={onLogout}
              />
            </div>
          </div>
        </div>
      </div>
      <StudySettingsDialog
        settings={settings}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={onUpdateSettings}
        onReset={onResetSettings}
      />
    </header>
  );
}
