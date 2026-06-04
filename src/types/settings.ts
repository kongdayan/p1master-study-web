export interface StudySettings {
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  autoExplainWrong: boolean;
  autoRemoveWrongOnCorrect: boolean;
}

export const defaultStudySettings: StudySettings = {
  llmBaseUrl: "https://api.deepseek.com/v1/chat/completions",
  llmApiKey: "",
  llmModel: "deepseek-v4-flash",
  autoExplainWrong: false,
  autoRemoveWrongOnCorrect: true
};
