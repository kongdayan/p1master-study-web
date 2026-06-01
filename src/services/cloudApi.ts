import type { CloudAuthProviders, CloudProgressSnapshot, CloudUser, ProgressPatch } from "@/types/cloud";

export async function fetchCurrentUser() {
  return fetchJson<{ user: CloudUser | null; providers: CloudAuthProviders }>("/api/me");
}

export async function fetchOAuthUrl(provider: "google" | "apple", returnTo: string) {
  return fetchJson<{ authUrl: string }>(`/api/auth/${provider}/url?returnTo=${encodeURIComponent(returnTo)}&ts=${Date.now()}`);
}

export async function fetchGooglePopupConfig(returnTo: string) {
  return fetchJson<{ clientId: string; scope: string; state: string }>(`/api/auth/google/popup-config?returnTo=${encodeURIComponent(returnTo)}&ts=${Date.now()}`);
}

export async function completeGooglePopupOAuth(code: string, state: string) {
  return fetchJson<{ ok: true; redirectPath: string }>("/api/auth/google/popup", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, state }).toString()
  });
}

export async function completeGoogleOAuth(code: string, state: string) {
  return fetchJson<{ ok: true; redirectPath: string }>("/api/auth/google/complete", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, state }).toString()
  });
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
