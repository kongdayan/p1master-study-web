import { Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { StudySettings } from "@/types/settings";

interface StudySettingsDialogProps {
  settings: StudySettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: StudySettings) => void;
  onReset: () => void;
}

export function StudySettingsDialog({ settings, open, onOpenChange, onSave, onReset }: StudySettingsDialogProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-label="学习配置">
      <div className="grid max-h-[90vh] w-full max-w-xl gap-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-teal-700">
              <Settings className="h-5 w-5" />
              <span className="text-sm font-bold">学习配置</span>
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">解释与错题本设置</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            API URL
            <Input value={draft.llmBaseUrl} onChange={(event) => setDraft({ ...draft, llmBaseUrl: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            API Key
            <Input
              type="password"
              value={draft.llmApiKey}
              onChange={(event) => setDraft({ ...draft, llmApiKey: event.target.value })}
              placeholder="sk-..."
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            模型
            <Input value={draft.llmModel} onChange={(event) => setDraft({ ...draft, llmModel: event.target.value })} />
          </label>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
            <Checkbox checked={draft.autoExplainWrong} onCheckedChange={(value) => setDraft({ ...draft, autoExplainWrong: value === true })} />
            答错后自动生成解释
          </label>
          <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
            <Checkbox checked={draft.autoRemoveWrongOnCorrect} onCheckedChange={(value) => setDraft({ ...draft, autoRemoveWrongOnCorrect: value === true })} />
            错题再次做对后自动移出错题本
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onReset}>
            恢复默认
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            保存配置
          </Button>
        </div>
      </div>
    </div>
  );
}
