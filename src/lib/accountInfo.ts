import type { CloudUser, SyncStatus } from "@/types/cloud";

export const syncLabel: Record<SyncStatus, string> = {
  local: "本地保存",
  syncing: "同步中",
  synced: "已同步",
  offline: "离线暂存",
  error: "同步失败"
};

export function displayName(user: CloudUser) {
  return user.name?.trim() || user.email.split("@")[0] || "已登录用户";
}

export function shortUserId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
}

export function initials(user: CloudUser) {
  const source = displayName(user) || user.email;
  return source.slice(0, 1).toUpperCase();
}

export function syncDetail(status: SyncStatus, lastSyncedAt: string | null) {
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
