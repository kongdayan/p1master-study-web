import { Cloud, LogOut, Settings, Settings2, UserRound, Wand2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { displayName, initials, shortUserId, syncDetail, syncLabel } from "@/lib/accountInfo";
import type { CloudAuthProviders, CloudUser, SyncStatus } from "@/types/cloud";
import type { LlmMode, StudySettings } from "@/types/settings";

interface SettingsDialogProps {
  settings: StudySettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: StudySettings) => void;
  onReset: () => void;
  user: CloudUser | null;
  authLoading: boolean;
  providers: CloudAuthProviders;
  openrouterConnected: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  onConnectOpenRouter: () => void;
  onDisconnectOpenRouter: () => void;
  onLogin: (provider: "google" | "apple") => void;
  onLogout: () => void;
  onRetrySync: () => void;
}

const modeStyles = {
  base: "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
  active: "bg-white text-slate-950 shadow-sm",
  inactive: "text-slate-600 hover:text-slate-950"
};

function SectionTitle({ icon: Icon, children }: { icon: typeof UserRound; children: string }) {
  return (
    <div className="flex items-center gap-2 text-teal-700">
      <Icon className="h-4 w-4" />
      <span className="text-sm font-bold">{children}</span>
    </div>
  );
}

export function SettingsDialog({
  settings,
  open,
  onOpenChange,
  onSave,
  onReset,
  user,
  authLoading,
  providers,
  openrouterConnected,
  syncStatus,
  syncError,
  lastSyncedAt,
  onConnectOpenRouter,
  onDisconnectOpenRouter,
  onLogin,
  onLogout,
  onRetrySync
}: SettingsDialogProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  if (!open) return null;

  const mode: LlmMode = draft.llmMode === "openrouter" ? "openrouter" : "custom";
  const setMode = (next: LlmMode) => setDraft({ ...draft, llmMode: next });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-label="配置中心">
      <div className="grid max-h-[90vh] w-full max-w-xl gap-5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-teal-700">
              <Settings className="h-5 w-5" />
              <span className="text-sm font-bold">配置中心</span>
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">账户、AI 解释与学习设置</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <SectionTitle icon={UserRound}>账户</SectionTitle>
          {!user ? (
            <>
              <p className="text-xs leading-5 text-slate-600">登录后可在云端同步学习进度，并连接 OpenRouter 使用自己的模型额度。</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={!providers.google || authLoading} onClick={() => onLogin("google")}>
                  {providers.google ? (authLoading ? "登录中..." : "使用 Google 登录") : "Google 待配置"}
                </Button>
                <Button size="sm" variant="outline" disabled={!providers.apple || authLoading} onClick={() => onLogin("apple")}>
                  {providers.apple ? (authLoading ? "登录中..." : "使用 Apple 登录") : "Apple 待配置"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-50 text-base font-extrabold text-teal-800">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <span>{initials(user)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{displayName(user)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {user.email}
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="font-mono" title={user.id}>
                      ID {shortUserId(user.id)}
                    </span>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                  退出登录
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <Cloud className="h-4 w-4 text-teal-700" />
                <span className="font-semibold">{syncLabel[syncStatus]}</span>
                <span title={lastSyncedAt || undefined}>{syncDetail(syncStatus, lastSyncedAt)}</span>
                {syncStatus === "error" ? (
                  <Button size="sm" variant="outline" className="px-2.5 py-1 text-xs" onClick={onRetrySync}>
                    重试
                  </Button>
                ) : null}
                {syncError ? <span className="max-w-full truncate text-red-600">{syncError}</span> : null}
              </div>
            </>
          )}
        </section>

        <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <SectionTitle icon={Wand2}>AI 解释</SectionTitle>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="AI 接入方式">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "openrouter"}
              className={`${modeStyles.base} ${mode === "openrouter" ? modeStyles.active : modeStyles.inactive}`}
              onClick={() => setMode("openrouter")}
            >
              OpenRouter
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "custom"}
              className={`${modeStyles.base} ${mode === "custom" ? modeStyles.active : modeStyles.inactive}`}
              onClick={() => setMode("custom")}
            >
              其他
            </button>
          </div>

          {mode === "openrouter" ? (
            <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-bold text-slate-800">OpenRouter 连接</p>
                  <p className="text-xs leading-5 text-slate-600">用你自己的 OpenRouter 账户额度调用模型，无需输入 API Key。</p>
                </div>
                {!user ? null : openrouterConnected ? (
                  <Button size="sm" variant="outline" onClick={onDisconnectOpenRouter}>
                    断开
                  </Button>
                ) : (
                  <Button size="sm" onClick={onConnectOpenRouter}>
                    连接 OpenRouter
                  </Button>
                )}
              </div>
              {user && openrouterConnected && (
                <p className="text-xs text-teal-700">已连接（{user.email}），模型调用将记在你的 OpenRouter 账户上。</p>
              )}
              {!user && <p className="text-xs text-slate-500">请先在上方账户区登录，再连接 OpenRouter。</p>}
            </div>
          ) : (
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3">
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
            </div>
          )}

          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            模型
            <Input
              value={draft.llmModel}
              onChange={(event) => setDraft({ ...draft, llmModel: event.target.value })}
              placeholder={mode === "openrouter" ? "openai/gpt-4o-mini" : "deepseek-v4-flash"}
            />
          </label>
        </section>

        <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <SectionTitle icon={Settings2}>学习设置</SectionTitle>
          <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
            <Checkbox checked={draft.autoExplainWrong} onCheckedChange={(value) => setDraft({ ...draft, autoExplainWrong: value === true })} />
            答错后自动生成解释
          </label>
          <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
            <Checkbox checked={draft.autoRemoveWrongOnCorrect} onCheckedChange={(value) => setDraft({ ...draft, autoRemoveWrongOnCorrect: value === true })} />
            错题再次做对后自动移出错题本
          </label>
        </section>

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
