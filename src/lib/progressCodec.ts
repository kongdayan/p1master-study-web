import type { ChoiceLetter } from "@/types/exam";
import type { CloudProgressSnapshot, ProgressChange, SelectedCode } from "@/types/cloud";

const choices: ChoiceLetter[] = ["A", "B", "C", "D"];

export function choiceToSelected(choice: ChoiceLetter | null | undefined): SelectedCode {
  if (!choice) return 0;
  const index = choices.indexOf(choice);
  return index >= 0 ? ((index + 1) as SelectedCode) : 0;
}

export function selectedToChoice(selected: SelectedCode | number): ChoiceLetter | null {
  if (selected >= 1 && selected <= 4) return choices[selected - 1] || null;
  return null;
}

export function encodeAnswers(changes: Array<Pick<ProgressChange, "question" | "selected">>, maxQuestion: number) {
  const bytes = new Uint8Array(Math.ceil((Math.max(0, maxQuestion) * 3) / 8));
  changes.forEach((change) => {
    if (!change.question || change.question < 1 || !change.selected) return;
    writeBits(bytes, (change.question - 1) * 3, change.selected, 3);
  });
  return bytesToBase64Url(bytes);
}

export function decodeAnswers(encoded: string, questionCount: number) {
  const bytes = base64UrlToBytes(encoded);
  const answers: SelectedCode[] = Array.from({ length: questionCount + 1 }, () => 0 as SelectedCode);
  for (let question = 1; question <= questionCount; question += 1) {
    answers[question] = readBits(bytes, (question - 1) * 3, 3) as SelectedCode;
  }
  return answers;
}

export function encodeBitset(questions: number[], maxQuestion: number) {
  const bytes = new Uint8Array(Math.ceil(Math.max(0, maxQuestion) / 8));
  questions.forEach((question) => {
    if (!question || question < 1) return;
    const offset = question - 1;
    bytes[Math.floor(offset / 8)] |= 1 << (offset % 8);
  });
  return bytesToBase64Url(bytes);
}

export function decodeBitset(encoded: string, questionCount: number) {
  const bytes = base64UrlToBytes(encoded);
  const flags: boolean[] = Array.from({ length: questionCount + 1 }, () => false);
  for (let question = 1; question <= questionCount; question += 1) {
    const offset = question - 1;
    flags[question] = Boolean(bytes[Math.floor(offset / 8)] & (1 << (offset % 8)));
  }
  return flags;
}

export function compactSnapshotSize(snapshot: CloudProgressSnapshot) {
  return snapshot.answers.length + snapshot.wrong.length + snapshot.seen.length;
}

function writeBits(bytes: Uint8Array, bitOffset: number, value: number, width: number) {
  for (let bit = 0; bit < width; bit += 1) {
    if (value & (1 << bit)) {
      const target = bitOffset + bit;
      bytes[Math.floor(target / 8)] |= 1 << (target % 8);
    }
  }
}

function readBits(bytes: Uint8Array, bitOffset: number, width: number) {
  let value = 0;
  for (let bit = 0; bit < width; bit += 1) {
    const target = bitOffset + bit;
    if (bytes[Math.floor(target / 8)] & (1 << (target % 8))) value |= 1 << bit;
  }
  return value;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  if (!value) return new Uint8Array();
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
