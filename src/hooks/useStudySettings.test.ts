import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useStudySettings } from "./useStudySettings";

const settingsKey = "study-settings:v1";

beforeEach(() => {
  localStorage.clear();
});

describe("useStudySettings", () => {
  it("normalizes legacy settings without llmMode to custom", () => {
    localStorage.setItem(settingsKey, JSON.stringify({ llmApiKey: "sk-old", llmModel: "deepseek-v4-flash" }));
    const { result } = renderHook(() => useStudySettings());
    expect(result.current.settings.llmMode).toBe("custom");
    expect(result.current.settings.llmApiKey).toBe("sk-old");
  });

  it("keeps openrouter mode when saved", () => {
    localStorage.setItem(settingsKey, JSON.stringify({ llmMode: "openrouter" }));
    const { result } = renderHook(() => useStudySettings());
    expect(result.current.settings.llmMode).toBe("openrouter");
  });

  it("falls back to custom for unknown modes", () => {
    localStorage.setItem(settingsKey, JSON.stringify({ llmMode: "weird" }));
    const { result } = renderHook(() => useStudySettings());
    expect(result.current.settings.llmMode).toBe("custom");
  });
});
