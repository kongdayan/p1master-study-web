import type { ChoiceLetter, Question } from "@/types/exam";
import type { StudySettings } from "@/types/settings";

interface ExplainQuestionOptions {
  question: Question;
  selected: ChoiceLetter | null;
  settings: StudySettings;
  onToken: (token: string) => void;
  signal?: AbortSignal;
}

export async function explainQuestion({ question, selected, settings, onToken, signal }: ExplainQuestionOptions) {
  const messages = [
    {
      role: "system",
      content:
        "你是香港保险中介人资格考试 IIQE Paper 1 的刷题老师。请用中文解释题目，重点说明正确答案为什么对，以及每个错误选项为什么不对。回答要清晰、紧凑、适合考前复习。"
    },
    {
      role: "user",
      content: buildPrompt(question, selected)
    }
  ];

  if (settings.llmMode === "openrouter") {
    const response = await fetch("/api/llm/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: settings.llmModel.trim(),
        stream: true,
        temperature: 0.2,
        messages
      }),
      signal
    });
    if (!response.ok || !response.body) {
      const message = await response.text();
      throw new Error(toFriendlyOpenRouterError(response.status, message));
    }
    await readSse(response.body, onToken);
    return;
  }

  if (!settings.llmApiKey.trim()) throw new Error("请先在配置中填写 API Key。");
  const response = await fetch(settings.llmBaseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.llmApiKey.trim()}`
    },
    body: JSON.stringify({ model: settings.llmModel.trim(), stream: true, temperature: 0.2, messages }),
    signal
  });

  if (!response.ok || !response.body) {
    const message = await response.text();
    throw new Error(toFriendlyLlmError(response.status, message));
  }

  await readSse(response.body, onToken);
}

function toFriendlyLlmError(status: number, rawMessage: string) {
  const message = parseProviderErrorMessage(rawMessage);
  const haystack = `${status} ${message} ${rawMessage}`.toLowerCase();

  if (status === 401 || status === 403 || /authentication|unauthorized|forbidden|api key|invalid key/.test(haystack)) {
    return "API Key 验证失败，请检查配置中心里的 API Key 是否正确。你可以前往 [DeepSeek API Keys](https://platform.deepseek.com/api_keys) 创建新的 API Key 后填入。";
  }

  if (status === 429 || /rate limit|quota|insufficient/.test(haystack)) {
    return "当前 API 调用额度或频率可能受限，请稍后重试，或检查 DeepSeek 账户额度。";
  }

  if (/model/.test(haystack)) {
    return "模型名称可能不正确，请检查配置中心里的模型名称和 API URL。";
  }

  if (/network|timeout/.test(haystack)) {
    return "AI 解释请求暂时连接不上，请稍后重试。";
  }

  return `AI 解释请求失败，请检查配置中心里的 API URL、模型名称和 API Key 是否正确。状态码：${status}`;
}

function toFriendlyOpenRouterError(status: number, rawMessage: string) {
  const message = parseProviderErrorMessage(rawMessage);
  const haystack = `${status} ${message} ${rawMessage}`.toLowerCase();

  if (status === 401 || status === 403 || status === 400 || /authentication|unauthorized|invalid|key/.test(haystack)) {
    return "OpenRouter 连接可能已失效，请在配置中心重新连接。";
  }

  if (status === 429 || /rate limit|quota|insufficient|balance/.test(haystack)) {
    return "当前调用额度或频率可能受限，请稍后重试，或检查 OpenRouter 账户余额。";
  }

  if (/model/.test(haystack)) {
    return "模型名称可能不正确，请检查配置中心里的模型名称。";
  }

  return `AI 解释请求失败，请稍后重试。状态码：${status}`;
}

function parseProviderErrorMessage(rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || "";
  } catch {
    return rawMessage;
  }
}

function buildPrompt(question: Question, selected: ChoiceLetter | null) {
  const options = question.options.map((option) => `${option.letter}. ${option.text}`).join("\n");
  return [
    `参考章节：${question.ref}`,
    `题干：${question.prompt}`,
    `选项：\n${options}`,
    `正确答案：${question.answer}`,
    selected ? `用户选择：${selected}` : "用户尚未作答或只是查看答案",
    "请按以下结构回答：",
    "1. 题目考点",
    "2. 正确答案为什么成立",
    "3. 其他选项为什么不对",
    "4. 记忆提示"
  ].join("\n\n");
}

async function readSse(body: ReadableStream<Uint8Array>, onToken: (token: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\n\n+/);
    buffer = parts.pop() || "";
    parts.forEach((part) => readSsePart(part, onToken));
  }
  if (buffer) readSsePart(buffer, onToken);
}

function readSsePart(part: string, onToken: (token: string) => void) {
  const lines = part
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"));
  lines.forEach((line) => {
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const data = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }> };
      const token = data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content || "";
      if (token) onToken(token);
    } catch {
      onToken(payload);
    }
  });
}
