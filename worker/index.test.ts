import { describe, expect, it } from "vitest";
import { safeReturnPath, validProgressChange } from "./index";

describe("validProgressChange", () => {
  it("accepts a complete valid change", () => {
    expect(
      validProgressChange({ question: 3, selected: 2, wrong: true, seen: false, clientUpdatedAt: "2026-08-27T00:00:00Z" })
    ).toBe(true);
  });

  it("accepts partial changes", () => {
    expect(validProgressChange({ question: 1, clientUpdatedAt: "2026-08-27T00:00:00Z" })).toBe(true);
    expect(validProgressChange({ question: 1, seen: true, clientUpdatedAt: "2026-08-27T00:00:00Z" })).toBe(true);
  });

  it("rejects non-integer or non-positive question numbers", () => {
    expect(validProgressChange({ question: 0, clientUpdatedAt: "x" })).toBe(false);
    expect(validProgressChange({ question: -1, clientUpdatedAt: "x" })).toBe(false);
    expect(validProgressChange({ question: 1.5, clientUpdatedAt: "x" })).toBe(false);
    expect(validProgressChange({ question: Number.NaN, clientUpdatedAt: "x" })).toBe(false);
  });

  it("rejects out-of-range selected codes", () => {
    expect(validProgressChange({ question: 1, selected: 6, clientUpdatedAt: "x" })).toBe(false);
    expect(validProgressChange({ question: 1, selected: -1, clientUpdatedAt: "x" })).toBe(false);
    expect(validProgressChange({ question: 1, selected: 1.5, clientUpdatedAt: "x" })).toBe(false);
  });

  it("rejects non-string clientUpdatedAt", () => {
    expect(validProgressChange({ question: 1, clientUpdatedAt: 123 })).toBe(false);
    expect(validProgressChange({ question: 1, clientUpdatedAt: undefined })).toBe(false);
  });
});

describe("safeReturnPath", () => {
  it("keeps safe relative paths", () => {
    expect(safeReturnPath("/")).toBe("/");
    expect(safeReturnPath("/practice?exam=iiqe-paper1&view=practice&question=5")).toBe(
      "/practice?exam=iiqe-paper1&view=practice&question=5"
    );
  });

  it("rejects open redirects", () => {
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath("https://evil.com")).toBe("/");
    expect(safeReturnPath("//evil.com")).toBe("/");
    expect(safeReturnPath("javascript:alert(1)")).toBe("/");
    expect(safeReturnPath("/api/auth/logout")).toBe("/");
  });
});
