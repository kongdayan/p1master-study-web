import { describe, expect, it } from "vitest";
import type { SelectedCode } from "@/types/cloud";
import {
  choiceToSelected,
  decodeAnswers,
  decodeBitset,
  encodeAnswers,
  encodeBitset,
  selectedToChoice
} from "./progressCodec";

describe("choiceToSelected / selectedToChoice", () => {
  it("round-trips all choices", () => {
    (["A", "B", "C", "D"] as const).forEach((letter, index) => {
      expect(choiceToSelected(letter)).toBe(index + 1);
      expect(selectedToChoice(index + 1)).toBe(letter);
    });
  });

  it("maps null/undefined/unknown to neutral values", () => {
    expect(choiceToSelected(null)).toBe(0);
    expect(choiceToSelected(undefined)).toBe(0);
    expect(selectedToChoice(0)).toBeNull();
    expect(selectedToChoice(5)).toBeNull();
    expect(selectedToChoice(-1)).toBeNull();
  });
});

describe("encodeAnswers / decodeAnswers", () => {
  it("round-trips answers across byte boundaries", () => {
    const changes = [1, 2, 3, 4, 5, 8, 9, 16, 914].map((question, index) => ({
      question,
      selected: ((index % 4) + 1) as SelectedCode
    }));
    const decoded = decodeAnswers(encodeAnswers(changes, 914), 914);
    changes.forEach(({ question, selected }) => expect(decoded[question]).toBe(selected));
    expect(decoded[6]).toBe(0);
  });

  it("ignores question 0 and selected 0", () => {
    const encoded = encodeAnswers(
      [
        { question: 0, selected: 2 as SelectedCode },
        { question: 3, selected: 0 as SelectedCode }
      ],
      3
    );
    const decoded = decodeAnswers(encoded, 3);
    expect(decoded[1]).toBe(0);
    expect(decoded[3]).toBe(0);
  });

  it("encodes empty input as empty string when max is zero", () => {
    expect(encodeAnswers([], 0)).toBe("");
    const decoded = decodeAnswers(encodeAnswers([], 10), 10);
    expect(decoded.every((selected) => selected === 0)).toBe(true);
  });
});

describe("encodeBitset / decodeBitset", () => {
  it("round-trips flags across byte boundaries", () => {
    const questions = [1, 8, 9, 16, 17, 914];
    const flags = decodeBitset(encodeBitset(questions, 914), 914);
    questions.forEach((question) => expect(flags[question]).toBe(true));
    expect(flags[2]).toBe(false);
    expect(flags[15]).toBe(false);
    expect(flags[913]).toBe(false);
  });

  it("round-trips empty flag sets", () => {
    const flags = decodeBitset(encodeBitset([], 10), 10);
    expect(flags.every((flag) => !flag)).toBe(true);
  });

  it("ignores question 0", () => {
    const flags = decodeBitset(encodeBitset([0, 1], 1), 1);
    expect(flags[1]).toBe(true);
  });
});
