export type LlmMode = "openrouter" | "custom";

export interface StudySettings {
  llmMode: LlmMode;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  autoExplainWrong: boolean;
  autoRemoveWrongOnCorrect: boolean;
}

export const defaultStudySettings: StudySettings = {
  llmMode: "custom",
  llmBaseUrl: "https://api.deepseek.com/v1/chat/completions",
  llmApiKey: "",
  llmModel: "deepseek-v4-flash",
  autoExplainWrong: false,
  autoRemoveWrongOnCorrect: true
};
