import type { CloudAuthProviders, CloudProgressSnapshot, CloudUser, ProgressPatch } from "@/types/cloud";

export async function fetchCurrentUser() {
  return fetchJson<{ user: CloudUser | null; providers: CloudAuthProviders }>("/api/me");
}

export async function logoutCloudUser() {
  return fetchJson<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export async function fetchCloudProgress(examId: string) {
  return fetchJson<CloudProgressSnapshot>(`/api/progress/${encodeURIComponent(examId)}`);
}

export async function syncCloudProgress(examId: string, patch: ProgressPatch) {
  return fetchJson<CloudProgressSnapshot>(`/api/progress/${encodeURIComponent(examId)}/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch)
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
