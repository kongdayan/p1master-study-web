import { Cloud, LogOut, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CloudAuthProviders, CloudUser, SyncStatus } from "@/types/cloud";

interface AuthPanelProps {
  user: CloudUser | null;
  providers: CloudAuthProviders;
  loading: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  onLogin: (provider: "google" | "apple") => void;
  onLogout: () => void;
}

const syncLabel: Record<SyncStatus, string> = {
  local: "本地保存",
  syncing: "同步中",
  synced: "已同步",
  offline: "离线暂存",
  error: "同步失败"
};

function displayName(user: CloudUser) {
  return user.name?.trim() || user.email.split("@")[0] || "已登录用户";
}

function shortUserId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
}

function initials(user: CloudUser) {
  const source = displayName(user) || user.email;
  return source.slice(0, 1).toUpperCase();
}

export function AuthPanel({ user, providers, loading, syncStatus, syncError, onLogin, onLogout }: AuthPanelProps) {
  if (loading) return <Badge className="justify-center py-2">检查登录中</Badge>;

  if (!user) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!providers.google} onClick={() => onLogin("google")}>
          {providers.google ? "使用 Google 登录" : "Google 待配置"}
        </Button>
        <Button size="sm" variant="outline" disabled={!providers.apple} onClick={() => onLogin("apple")}>
          {providers.apple ? "使用 Apple 登录" : "Apple 待配置"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex min-w-0 max-w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm sm:max-w-[360px]">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-50 text-sm font-extrabold text-teal-800">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <span>{initials(user)}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{displayName(user)}</span>
            <Badge className="shrink-0 gap-1 py-1 text-[11px]" title={syncError || undefined}>
              <Cloud className="h-3.5 w-3.5" />
              {syncLabel[syncStatus]}
            </Badge>
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className="truncate">{user.email}</span>
            <span className="hidden shrink-0 text-slate-300 sm:inline">/</span>
            <span className="hidden shrink-0 font-mono sm:inline" title={user.id}>
              ID {shortUserId(user.id)}
            </span>
          </div>
        </div>
        {!user.avatarUrl ? <UserRound className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" /> : null}
      </div>
      <Button size="sm" variant="outline" onClick={onLogout} title="退出登录">
        <LogOut className="h-4 w-4" />
        退出
      </Button>
    </div>
  );
}
