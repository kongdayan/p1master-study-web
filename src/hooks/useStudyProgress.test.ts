import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { encodeAnswers, encodeBitset } from "@/lib/progressCodec";
import type { SelectedCode } from "@/types/cloud";
import type { ChoiceLetter, Question } from "@/types/exam";
import { useStudyProgress } from "./useStudyProgress";

function makeQuestion(numericId: number, answer: ChoiceLetter = "A"): Question {
  return {
    id: `q${numericId}`,
    numericId,
    chapterId: "1",
    ref: "第 1 章",
    prompt: `题目 ${numericId}`,
    options: [
      { letter: "A", text: "选项 A" },
      { letter: "B", text: "选项 B" },
      { letter: "C", text: "选项 C" },
      { letter: "D", text: "选项 D" }
    ],
    answer,
    tags: []
  };
}

const questions = [makeQuestion(1, "A"), makeQuestion(2, "B"), makeQuestion(3, "C")];

beforeEach(() => {
  localStorage.clear();
});

describe("useStudyProgress", () => {
  it("starts with empty progress", () => {
    const { result } = renderHook(() => useStudyProgress("exam", questions));
    expect(result.current.stats).toEqual({ answered: 0, correct: 0, rate: 0, wrong: 0 });
    expect(result.current.progress.syncQueue).toEqual([]);
    expect(result.current.progress.practiceState.index).toBe(0);
  });

  it("records a correct answer and clears the wrong flag", () => {
    const { result } = renderHook(() => useStudyProgress("exam", questions));
    act(() => result.current.toggleWrong("q1"));
    expect(result.current.progress.wrongQuestionIds["q1"]).toBe(true);

    act(() => result.current.answerQuestion(questions[0], "A", { removeWrongOnCorrect: true }));
    expect(result.current.stats.correct).toBe(1);
    expect(result.current.progress.wrongQuestionIds["q1"]).toBeUndefined();
    expect(result.current.practiceState.revealed).toBe(true);
    expect(result.current.practiceState.selected).toBe("A");
  });

  it("records a wrong answer into the wrong book", () => {
    const { result } = renderHook(() => useStudyProgress("exam", questions));
    act(() => result.current.answerQuestion(questions[0], "B", { removeWrongOnCorrect: true }));
    expect(result.current.stats.correct).toBe(0);
    expect(result.current.stats.wrong).toBe(1);
    expect(result.current.progress.wrongQuestionIds["q1"]).toBe(true);
    expect(result.current.progress.answerHistory["q1"].correct).toBe(false);
  });

  it("filters by wrong book", () => {
    const { result } = renderHook(() => useStudyProgress("exam", questions));
    act(() => result.current.answerQuestion(questions[1], "A", { removeWrongOnCorrect: true }));
    act(() => result.current.updatePracticeState({ wrongOnly: true }));
    expect(result.current.filteredQuestions.map((question) => question.id)).toEqual(["q2"]);
  });

  it("queues one sync change per question, merged by question number", () => {
    const { result } = renderHook(() => useStudyProgress("exam", questions));
    act(() => result.current.answerQuestion(questions[0], "A", { removeWrongOnCorrect: true }));
    act(() => result.current.toggleWrong("q2"));

    const queue = result.current.progress.syncQueue;
    expect(queue).toHaveLength(2);
    expect(queue.map((change) => change.question)).toEqual([1, 2]);
    expect(queue[0].selected).toBe(1);
    expect(queue[0].seen).toBe(true);
    expect(queue[1].wrong).toBe(true);

    act(() => result.current.answerQuestion(questions[1], "B", { removeWrongOnCorrect: true }));
    expect(result.current.progress.syncQueue).toHaveLength(2);
    const merged = result.current.progress.syncQueue.find((change) => change.question === 2);
    expect(merged?.selected).toBe(2);
    expect(merged?.wrong).toBe(false);
  });

  it("markSeen is idempotent", () => {
    const { result } = renderHook(() => useStudyProgress("exam", questions));
    act(() => result.current.markSeen(questions[1]));
    act(() => result.current.markSeen(questions[1]));
    expect(result.current.progress.syncQueue).toHaveLength(1);
    expect(result.current.progress.seenQuestionIds["q2"]).toBeTruthy();
  });

  it("applies a cloud snapshot", () => {
    const { result } = renderHook(() => useStudyProgress("exam", questions));
    act(() => {
      result.current.applyCloudSnapshot({
        v: 1,
        examId: "exam",
        revision: 3,
        cursorQuestion: 2,
        answers: encodeAnswers([{ question: 1, selected: 1 as SelectedCode }], 3),
        wrong: encodeBitset([2], 3),
        seen: encodeBitset([1, 2, 3], 3),
        updatedAt: "2026-08-27T00:00:00.000Z"
      });
    });
    expect(result.current.progress.cloudRevision).toBe(3);
    expect(result.current.progress.answerHistory["q1"].selected).toBe("A");
    expect(result.current.progress.wrongQuestionIds["q2"]).toBe(true);
    expect(result.current.progress.seenQuestionIds["q3"]).toBeTruthy();
    expect(result.current.progress.syncQueue).toEqual([]);
    expect(result.current.practiceState.index).toBe(1);
    expect(result.current.practiceState.revealed).toBe(false);
  });

  it("resetProgress clears everything", () => {
    const { result } = renderHook(() => useStudyProgress("exam", questions));
    act(() => result.current.answerQuestion(questions[0], "A", { removeWrongOnCorrect: true }));
    act(() => result.current.resetProgress());
    expect(result.current.stats.answered).toBe(0);
    expect(result.current.progress.syncQueue).toEqual([]);
  });
});
