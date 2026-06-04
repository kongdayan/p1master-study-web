import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "@/lib/storage";
import { defaultStudySettings, type StudySettings } from "@/types/settings";

const settingsKey = "study-settings:v1";

export function useStudySettings() {
  const [settings, setSettings] = useState<StudySettings>(() => normalizeSettings(readStorage<Partial<StudySettings>>(settingsKey, {})));

  useEffect(() => {
    writeStorage(settingsKey, settings);
  }, [settings]);

  function updateSettings(next: Partial<StudySettings>) {
    setSettings((current) => ({
      ...current,
      ...next
    }));
  }

  function resetSettings() {
    setSettings(defaultStudySettings);
  }

  return { settings, updateSettings, resetSettings };
}

function normalizeSettings(saved: Partial<StudySettings>): StudySettings {
  const next = {
    ...defaultStudySettings,
    ...saved
  };
  if (next.llmModel === "deepseek-v4-flash-1m") next.llmModel = "deepseek-v4-flash";
  return next;
}
