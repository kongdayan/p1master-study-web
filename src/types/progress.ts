import type { ChoiceLetter } from "@/types/exam";
import type { ProgressChange } from "@/types/cloud";

export interface AnswerRecord {
  selected: ChoiceLetter;
  answer: ChoiceLetter;
  correct: boolean;
  chapterId: string;
  ref: string;
  updatedAt: string;
}

export interface PracticeState {
  chapterId: string;
  query: string;
  wrongOnly: boolean;
  index: number;
  selected: ChoiceLetter | null;
  revealed: boolean;
  hiddenAnswers: Record<string, boolean>;
}

export interface StudyProgress {
  version: 1;
  exportedAt?: string;
  practiceState: PracticeState;
  wrongQuestionIds: Record<string, boolean>;
  answerHistory: Record<string, AnswerRecord>;
  seenQuestionIds: Record<string, string>;
  checklist: Record<string, boolean>;
  cloudRevision: number;
  syncQueue: ProgressChange[];
}
