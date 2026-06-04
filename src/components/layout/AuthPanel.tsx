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
  lastSyncedAt: string | null;
  onRetrySync: () => void;
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

function syncDetail(status: SyncStatus, lastSyncedAt: string | null) {
  if (status === "syncing") return "正在保存";
  if (status === "offline") return "网络恢复后同步";
  if (status === "error") return "点击重试";
  if (status === "local") return "仅此设备";
  if (!lastSyncedAt) return "刚刚同步";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 1000));
  if (seconds < 10) return "刚刚同步";
  if (seconds < 60) return `${seconds} 秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时前`;
}

export function AuthPanel({ user, providers, loading, syncStatus, syncError, lastSyncedAt, onRetrySync, onLogin, onLogout }: AuthPanelProps) {
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
    <div className="flex min-w-0 items-center justify-end gap-2">
      <div className="flex min-w-0 max-w-[min(100%,360px)] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
        <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-50 text-sm font-extrabold text-teal-800">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <span>{initials(user)}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-900">{displayName(user)}</span>
            <Badge className="shrink-0 gap-1 px-1.5 py-0.5 text-[11px]" title={syncError || undefined}>
              <Cloud className="h-3.5 w-3.5" />
              {syncLabel[syncStatus]}
            </Badge>
          </div>
          <div className="mt-0.5 grid min-w-0 gap-0.5 text-[11px] font-medium leading-4 text-slate-500">
            <span className="truncate">{user.email}</span>
            <span className="truncate">
              <span className="font-mono" title={user.id}>
                ID {shortUserId(user.id)}
              </span>
              <span className="mx-1 text-slate-300">/</span>
              <span title={lastSyncedAt || undefined}>{syncDetail(syncStatus, lastSyncedAt)}</span>
            </span>
          </div>
        </div>
        {!user.avatarUrl ? <UserRound className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" /> : null}
      </div>
      {syncStatus === "error" ? (
        <Button size="sm" variant="outline" className="shrink-0 px-2.5" onClick={onRetrySync}>
          重试
        </Button>
      ) : null}
      <Button size="sm" variant="outline" className="shrink-0 px-2.5" onClick={onLogout} title="退出登录">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">退出</span>
      </Button>
    </div>
  );
}
