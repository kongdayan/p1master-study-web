import { Cloud, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { displayName, initials, syncDetail, syncLabel } from "@/lib/accountInfo";
import type { CloudUser, SyncStatus } from "@/types/cloud";

interface AccountEntryProps {
  user: CloudUser | null;
  loading: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  onClick: () => void;
}

const syncBadgeStyle: Record<SyncStatus, string> = {
  local: "border-slate-200 text-slate-600",
  syncing: "border-sky-200 text-sky-700",
  synced: "border-teal-200 text-teal-700",
  offline: "border-amber-200 text-amber-700",
  error: "border-red-200 text-red-600"
};

export function AccountEntry({ user, loading, syncStatus, syncError, lastSyncedAt, onClick }: AccountEntryProps) {
  if (loading) return <Badge className="justify-center py-2">检查登录中</Badge>;

  if (!user) {
    return (
      <Button size="sm" variant="outline" onClick={onClick}>
        <UserRound className="h-4 w-4" />
        登录
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-colors hover:bg-slate-50"
      title={syncError ? `${syncLabel[syncStatus]}：${syncError}` : `${syncLabel[syncStatus]} · ${syncDetail(syncStatus, lastSyncedAt)}`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-teal-50 text-sm font-extrabold text-teal-800">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <span>{initials(user)}</span>}
      </span>
      <span className="hidden min-w-0 flex-col items-start leading-4 md:flex">
        <span className="max-w-[140px] truncate text-sm font-bold text-slate-900">{displayName(user)}</span>
        <Badge className={`mt-0.5 gap-1 px-1.5 py-0 text-[11px] ${syncBadgeStyle[syncStatus]}`}>
          <Cloud className="h-3 w-3" />
          {syncLabel[syncStatus]}
        </Badge>
      </span>
    </button>
  );
}
