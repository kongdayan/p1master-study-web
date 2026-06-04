import { useEffect, useMemo, useState } from "react";
import { decodeAnswers, decodeBitset, selectedToChoice, choiceToSelected } from "@/lib/progressCodec";
import { readStorage, writeStorage } from "@/lib/storage";
import type { ChoiceLetter, Question } from "@/types/exam";
import type { CloudProgressSnapshot, ProgressChange } from "@/types/cloud";
import type { AnswerRecord, PracticeState, StudyProgress } from "@/types/progress";

const defaultPracticeState: PracticeState = {
  chapterId: "all",
  query: "",
  wrongOnly: false,
  index: 0,
  selected: null,
  revealed: false,
  hiddenAnswers: {}
};

function emptyProgress(): StudyProgress {
  return {
    version: 1,
    practiceState: defaultPracticeState,
    wrongQuestionIds: {},
    answerHistory: {},
    seenQuestionIds: {},
    checklist: {},
    cloudRevision: 0,
    syncQueue: []
  };
}

export function useStudyProgress(examId: string, questions: Question[]) {
  const storageKey = `study-progress:${examId}:v1`;
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const [progress, setProgress] = useState<StudyProgress>(() => {
    const saved = readStorage<Partial<StudyProgress>>(storageKey, {});
    return {
      ...emptyProgress(),
      ...saved,
      practiceState: {
        ...defaultPracticeState,
        ...(saved.practiceState || {})
      },
      seenQuestionIds: saved.seenQuestionIds || {},
      cloudRevision: saved.cloudRevision || 0,
      syncQueue: saved.syncQueue || []
    };
  });

  useEffect(() => {
    writeStorage(storageKey, progress);
  }, [progress, storageKey]);

  const practiceState = progress.practiceState;

  const filteredQuestions = useMemo(() => {
    const term = practiceState.query.trim().toLowerCase();
    return questions.filter((question) => {
      const chapterPass = practiceState.chapterId === "all" || question.chapterId === practiceState.chapterId;
      const wrongPass = !practiceState.wrongOnly || progress.wrongQuestionIds[question.id];
      const text = `${question.ref} ${question.prompt} ${question.options.map((option) => option.text).join(" ")}`.toLowerCase();
      const searchPass = !term || text.includes(term);
      return chapterPass && wrongPass && searchPass;
    });
  }, [practiceState.chapterId, practiceState.query, practiceState.wrongOnly, progress.wrongQuestionIds, questions]);

  const stats = useMemo(() => {
    const answers = Object.values(progress.answerHistory);
    const correct = answers.filter((item) => item.correct).length;
    return {
      answered: answers.length,
      correct,
      rate: answers.length ? Math.round((correct / answers.length) * 100) : 0,
      wrong: Object.keys(progress.wrongQuestionIds).length
    };
  }, [progress.answerHistory, progress.wrongQuestionIds]);

  function updatePracticeState(next: Partial<PracticeState>) {
    setProgress((current) => ({
      ...current,
      practiceState: {
        ...current.practiceState,
        ...next
      }
    }));
  }

  function resetCurrentAnswer() {
    updatePracticeState({ selected: null, revealed: false });
  }

  function answerQuestion(question: Question, selected: ChoiceLetter, options: { removeWrongOnCorrect: boolean }) {
    const now = new Date().toISOString();
    const record: AnswerRecord = {
      selected,
      answer: question.answer,
      correct: selected === question.answer,
      chapterId: question.chapterId,
      ref: question.ref,
      updatedAt: now
    };
    setProgress((current) => {
      const wrongQuestionIds = { ...current.wrongQuestionIds };
      if (record.correct) {
        if (options.removeWrongOnCorrect) delete wrongQuestionIds[question.id];
      } else {
        wrongQuestionIds[question.id] = true;
      }
      const hiddenAnswers = { ...current.practiceState.hiddenAnswers };
      delete hiddenAnswers[question.id];
      return {
        ...current,
        wrongQuestionIds,
        seenQuestionIds: {
          ...current.seenQuestionIds,
          [question.id]: now
        },
        answerHistory: {
          ...current.answerHistory,
          [question.id]: record
        },
        syncQueue: appendSyncChange(current.syncQueue, {
          question: question.numericId,
          selected: choiceToSelected(selected),
          wrong: Boolean(wrongQuestionIds[question.id]),
          seen: true,
          clientUpdatedAt: now
        }),
        practiceState: {
          ...current.practiceState,
          selected,
          revealed: true,
          hiddenAnswers
        }
      };
    });
  }

  function toggleWrong(questionId: string) {
    setProgress((current) => {
      const question = questionById.get(questionId);
      const now = new Date().toISOString();
      const wrongQuestionIds = { ...current.wrongQuestionIds };
      if (wrongQuestionIds[questionId]) delete wrongQuestionIds[questionId];
      else wrongQuestionIds[questionId] = true;
      return {
        ...current,
        wrongQuestionIds,
        syncQueue: question
          ? appendSyncChange(current.syncQueue, {
              question: question.numericId,
              wrong: Boolean(wrongQuestionIds[questionId]),
              clientUpdatedAt: now
            })
          : current.syncQueue
      };
    });
  }

  function markSeen(question: Question) {
    const now = new Date().toISOString();
    setProgress((current) => {
      if (current.seenQuestionIds[question.id]) return current;
      return {
        ...current,
        seenQuestionIds: {
          ...current.seenQuestionIds,
          [question.id]: now
        },
        syncQueue: appendSyncChange(current.syncQueue, {
          question: question.numericId,
          seen: true,
          clientUpdatedAt: now
        })
      };
    });
  }

  function setChecklistItem(id: string, checked: boolean) {
    setProgress((current) => ({
      ...current,
      checklist: {
        ...current.checklist,
        [id]: checked
      }
    }));
  }

  function resetProgress() {
    setProgress(emptyProgress());
  }

  function importProgress(nextProgress: StudyProgress) {
    setProgress({
      ...emptyProgress(),
      ...nextProgress,
      practiceState: {
        ...defaultPracticeState,
        ...(nextProgress.practiceState || {})
      },
      seenQuestionIds: nextProgress.seenQuestionIds || {},
      cloudRevision: nextProgress.cloudRevision || 0,
      syncQueue: nextProgress.syncQueue || []
    });
  }

  function applyCloudSnapshot(snapshot: CloudProgressSnapshot) {
    setProgress((current) => mergeCloudSnapshot(current, snapshot, questions));
  }

  function clearSyncQueue(syncedCount: number, revision: number) {
    setProgress((current) => ({
      ...current,
      cloudRevision: revision,
      syncQueue: current.syncQueue.slice(syncedCount)
    }));
  }

  function buildFullSyncChanges() {
    return buildFullChanges(progress, questions);
  }

  return {
    progress,
    practiceState,
    filteredQuestions,
    stats,
    updatePracticeState,
    resetCurrentAnswer,
    answerQuestion,
    toggleWrong,
    markSeen,
    setChecklistItem,
    resetProgress,
    importProgress,
    applyCloudSnapshot,
    clearSyncQueue,
    buildFullSyncChanges
  };
}

function appendSyncChange(queue: ProgressChange[], change: ProgressChange) {
  const next = queue.filter((item) => item.question !== change.question);
  const existing = queue.find((item) => item.question === change.question);
  next.push({
    ...existing,
    ...change,
    selected: change.selected ?? existing?.selected,
    wrong: change.wrong ?? existing?.wrong,
    seen: change.seen ?? existing?.seen,
    clientUpdatedAt: change.clientUpdatedAt
  });
  return next.slice(-1000);
}

function mergeCloudSnapshot(current: StudyProgress, snapshot: CloudProgressSnapshot, questions: Question[]): StudyProgress {
  const answers = decodeAnswers(snapshot.answers, questions.length);
  const wrong = decodeBitset(snapshot.wrong, questions.length);
  const seen = decodeBitset(snapshot.seen, questions.length);
  const answerHistory: Record<string, AnswerRecord> = {};
  const wrongQuestionIds: Record<string, boolean> = {};
  const seenQuestionIds: Record<string, string> = {};
  const updatedAt = snapshot.updatedAt || new Date().toISOString();

  questions.forEach((question) => {
    const selected = selectedToChoice(answers[question.numericId] || 0);
    if (selected) {
      answerHistory[question.id] = {
        selected,
        answer: question.answer,
        correct: selected === question.answer,
        chapterId: question.chapterId,
        ref: question.ref,
        updatedAt
      };
    }
    if (wrong[question.numericId]) wrongQuestionIds[question.id] = true;
    if (seen[question.numericId]) seenQuestionIds[question.id] = updatedAt;
  });

  const cursorIndex = Math.max(0, questions.findIndex((question) => question.numericId === snapshot.cursorQuestion));
  return {
    ...current,
    answerHistory,
    wrongQuestionIds,
    seenQuestionIds,
    cloudRevision: snapshot.revision,
    syncQueue: [],
    practiceState: {
      ...current.practiceState,
      index: cursorIndex >= 0 ? cursorIndex : current.practiceState.index,
      selected: null,
      revealed: false
    }
  };
}

function buildFullChanges(progress: StudyProgress, questions: Question[]) {
  const changes = new Map<number, ProgressChange>();
  const ensure = (question: Question, updatedAt?: string) => {
    const existing = changes.get(question.numericId);
    if (existing) return existing;
    const next: ProgressChange = {
      question: question.numericId,
      clientUpdatedAt: updatedAt || new Date().toISOString()
    };
    changes.set(question.numericId, next);
    return next;
  };

  questions.forEach((question) => {
    const answer = progress.answerHistory[question.id];
    const seenAt = progress.seenQuestionIds[question.id];
    const wrong = progress.wrongQuestionIds[question.id];
    if (!answer && !seenAt && !wrong) return;
    const change = ensure(question, answer?.updatedAt || seenAt);
    if (answer) change.selected = choiceToSelected(answer.selected);
    if (seenAt || answer) change.seen = true;
    change.wrong = Boolean(wrong);
  });

  return Array.from(changes.values()).sort((a, b) => a.question - b.question);
}
