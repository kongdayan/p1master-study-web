import { useEffect, useMemo, useState } from "react";
import { readStorage, writeStorage } from "@/lib/storage";
import type { ChoiceLetter, Question } from "@/types/exam";
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
    checklist: {}
  };
}

export function useStudyProgress(examId: string, questions: Question[]) {
  const storageKey = `study-progress:${examId}:v1`;
  const [progress, setProgress] = useState<StudyProgress>(() => {
    const saved = readStorage<Partial<StudyProgress>>(storageKey, {});
    return {
      ...emptyProgress(),
      ...saved,
      practiceState: {
        ...defaultPracticeState,
        ...(saved.practiceState || {})
      }
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

  function answerQuestion(question: Question, selected: ChoiceLetter) {
    const record: AnswerRecord = {
      selected,
      answer: question.answer,
      correct: selected === question.answer,
      chapterId: question.chapterId,
      ref: question.ref,
      updatedAt: new Date().toISOString()
    };
    setProgress((current) => {
      const wrongQuestionIds = { ...current.wrongQuestionIds };
      if (record.correct) delete wrongQuestionIds[question.id];
      else wrongQuestionIds[question.id] = true;
      const hiddenAnswers = { ...current.practiceState.hiddenAnswers };
      delete hiddenAnswers[question.id];
      return {
        ...current,
        wrongQuestionIds,
        answerHistory: {
          ...current.answerHistory,
          [question.id]: record
        },
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
      const wrongQuestionIds = { ...current.wrongQuestionIds };
      if (wrongQuestionIds[questionId]) delete wrongQuestionIds[questionId];
      else wrongQuestionIds[questionId] = true;
      return { ...current, wrongQuestionIds };
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
      }
    });
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
    setChecklistItem,
    resetProgress,
    importProgress
  };
}
