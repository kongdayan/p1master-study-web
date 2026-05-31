import { Cloud, LogOut } from "lucide-react";
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
      <Badge className="gap-1.5 py-2" title={syncError || undefined}>
        <Cloud className="h-4 w-4" />
        {syncLabel[syncStatus]}
      </Badge>
      <div className="flex max-w-[260px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" /> : null}
        <span className="truncate text-xs font-semibold text-slate-700">{user.email}</span>
      </div>
      <Button size="sm" variant="outline" onClick={onLogout} title="退出登录">
        <LogOut className="h-4 w-4" />
        退出
      </Button>
    </div>
  );
}
