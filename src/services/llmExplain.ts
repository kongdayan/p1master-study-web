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
  if (!settings.llmApiKey.trim()) throw new Error("请先在配置中填写 API Key。");
  const response = await fetch(settings.llmBaseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.llmApiKey.trim()}`
    },
    body: JSON.stringify({
      model: settings.llmModel.trim(),
      stream: true,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "你是香港保险中介人资格考试 IIQE Paper 1 的刷题老师。请用中文解释题目，重点说明正确答案为什么对，以及每个错误选项为什么不对。回答要清晰、紧凑、适合考前复习。"
        },
        {
          role: "user",
          content: buildPrompt(question, selected)
        }
      ]
    }),
    signal
  });

  if (!response.ok || !response.body) {
    const message = await response.text();
    throw new Error(message || `解释请求失败：${response.status}`);
  }

  await readSse(response.body, onToken);
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
