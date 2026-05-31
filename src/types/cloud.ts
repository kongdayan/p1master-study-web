export type SelectedCode = 0 | 1 | 2 | 3 | 4 | 5;

export interface CloudUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface CloudAuthProviders {
  google: boolean;
  apple: boolean;
}

export interface CloudProgressSnapshot {
  v: 1;
  examId: string;
  revision: number;
  cursorQuestion: number;
  answers: string;
  wrong: string;
  seen: string;
  updatedAt: string;
}

export interface ProgressChange {
  question: number;
  selected?: SelectedCode;
  wrong?: boolean;
  seen?: boolean;
  clientUpdatedAt: string;
}

export interface ProgressPatch {
  baseRevision: number;
  cursorQuestion?: number;
  changes: ProgressChange[];
}

export type SyncStatus = "local" | "syncing" | "synced" | "offline" | "error";
