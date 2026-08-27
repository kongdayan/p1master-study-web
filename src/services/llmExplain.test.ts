import { afterEach, describe, expect, it, vi } from "vitest";
import type { Question } from "@/types/exam";
import type { StudySettings } from "@/types/settings";
import { explainQuestion } from "./llmExplain";

function makeSettings(overrides: Partial<StudySettings> = {}): StudySettings {
  return {
    llmMode: "custom",
    llmBaseUrl: "https://example.com/v1/chat/completions",
    llmApiKey: "sk-test",
    llmModel: "test-model",
    autoExplainWrong: false,
    autoRemoveWrongOnCorrect: true,
    ...overrides
  };
}

const question: Question = {
  id: "q1",
  numericId: 1,
  chapterId: "1",
  ref: "第 1 章",
  prompt: "题目",
  options: [
    { letter: "A", text: "选项 A" },
    { letter: "B", text: "选项 B" }
  ],
  answer: "A",
  tags: []
};

function sseBody(...chunks: string[]) {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
      controller.close();
    }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("explainQuestion", () => {
  it("routes to /api/llm/explain without an API key in openrouter mode", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(sseBody('data: {"choices":[{"delta":{"content":"好"}}]}\n\ndata: [DONE]\n\n'), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const tokens: string[] = [];
    await explainQuestion({ question, selected: "A", settings: makeSettings({ llmMode: "openrouter" }), onToken: (token) => tokens.push(token) });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("/api/llm/explain");
    expect(init?.headers).not.toHaveProperty("authorization");
    const body = JSON.parse(String(init?.body)) as { model: string; stream: boolean; messages: unknown[] };
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(true);
    expect(body.messages).toHaveLength(2);
    expect(tokens.join("")).toBe("好");
  });

  it("routes to the custom URL with the API key in custom mode", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(sseBody('data: {"choices":[{"delta":{"content":"好"}}]}\n\n'), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await explainQuestion({ question, selected: null, settings: makeSettings(), onToken: () => {} });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://example.com/v1/chat/completions");
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk-test");
  });

  it("rejects before fetching when custom mode has no API key", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      explainQuestion({ question, selected: null, settings: makeSettings({ llmApiKey: "" }), onToken: () => {} })
    ).rejects.toThrow("请先在配置中填写 API Key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a friendly message when the OpenRouter connection is stale", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { message: "invalid api key" } }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      explainQuestion({ question, selected: null, settings: makeSettings({ llmMode: "openrouter" }), onToken: () => {} })
    ).rejects.toThrow("OpenRouter 连接可能已失效，请在配置中心重新连接。");
  });
});
