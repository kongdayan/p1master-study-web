import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCloudProgress, syncCloudProgress } from "@/services/cloudApi";
import type { Question } from "@/types/exam";
import type { StudyProgress } from "@/types/progress";
import type { CloudUser, SyncStatus } from "@/types/cloud";

const syncDebounceMs = 5000;
const maxBatchSize = 20;

interface UseCloudSyncOptions {
  examId: string;
  user: CloudUser | null;
  questions: Question[];
  progress: StudyProgress;
  currentQuestionNumber: number | null;
  applyCloudSnapshot: (snapshot: Awaited<ReturnType<typeof fetchCloudProgress>>) => void;
  clearSyncQueue: (syncedCount: number, revision: number) => void;
  buildFullSyncChanges: () => StudyProgress["syncQueue"];
}

export function useCloudSync({
  examId,
  user,
  questions,
  progress,
  currentQuestionNumber,
  applyCloudSnapshot,
  clearSyncQueue,
  buildFullSyncChanges
}: UseCloudSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("local");
  const [error, setError] = useState<string | null>(null);
  const bootstrappedKeyRef = useRef<string | null>(null);
  const syncingRef = useRef(false);
  const currentQuestionNumberRef = useRef<number | null>(currentQuestionNumber);
  const queueKey = useMemo(() => progress.syncQueue.map((change) => `${change.question}:${change.clientUpdatedAt}`).join("|"), [progress.syncQueue]);

  useEffect(() => {
    currentQuestionNumberRef.current = currentQuestionNumber;
  }, [currentQuestionNumber]);

  async function bootstrap() {
    if (!user || !questions.length || bootstrappedKeyRef.current === `${user.id}:${examId}`) return;
    bootstrappedKeyRef.current = `${user.id}:${examId}`;
    setStatus("syncing");
    setError(null);
    try {
      const snapshot = await fetchCloudProgress(examId);
      const fullChanges = buildFullSyncChanges();
      if (fullChanges.length) {
        const merged = await syncCloudProgress(examId, {
          baseRevision: snapshot.revision,
          cursorQuestion: currentQuestionNumberRef.current || snapshot.cursorQuestion || 1,
          changes: fullChanges
        });
        applyCloudSnapshot(merged);
      } else {
        applyCloudSnapshot(snapshot);
      }
      setStatus("synced");
    } catch (cause) {
      bootstrappedKeyRef.current = null;
      setStatus(navigator.onLine ? "error" : "offline");
      setError(cause instanceof Error ? cause.message : "同步失败");
    }
  }

  async function flushQueue() {
    if (!user || !questions.length || syncingRef.current || !progress.syncQueue.length) return;
    syncingRef.current = true;
    const changes = progress.syncQueue.slice();
    setStatus("syncing");
    setError(null);
    try {
      const snapshot = await syncCloudProgress(examId, {
        baseRevision: progress.cloudRevision,
        cursorQuestion: currentQuestionNumberRef.current || undefined,
        changes
      });
      clearSyncQueue(changes.length, snapshot.revision);
      applyCloudSnapshot(snapshot);
      setStatus("synced");
    } catch (cause) {
      setStatus(navigator.onLine ? "error" : "offline");
      setError(cause instanceof Error ? cause.message : "同步失败");
    } finally {
      syncingRef.current = false;
    }
  }

  useEffect(() => {
    if (!user) {
      bootstrappedKeyRef.current = null;
      setStatus("local");
      return;
    }
    void bootstrap();
  }, [examId, questions.length, user?.id]);

  useEffect(() => {
    if (!user || !queueKey) return;
    if (progress.syncQueue.length >= maxBatchSize) {
      void flushQueue();
      return;
    }
    const timeout = window.setTimeout(() => void flushQueue(), syncDebounceMs);
    return () => window.clearTimeout(timeout);
  }, [examId, queueKey, user?.id, progress.syncQueue.length]);

  useEffect(() => {
    const flushOnHidden = () => {
      if (document.visibilityState === "hidden") void flushQueue();
    };
    document.addEventListener("visibilitychange", flushOnHidden);
    return () => document.removeEventListener("visibilitychange", flushOnHidden);
  });

  useEffect(() => {
    const handleOnline = () => void flushQueue();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  });

  return {
    status: user ? status : "local",
    error,
    retry: flushQueue
  };
}
