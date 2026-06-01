import { useEffect, useState } from "react";
import { completeGooglePopupOAuth, fetchCurrentUser, fetchGooglePopupConfig, fetchOAuthUrl, logoutCloudUser } from "@/services/cloudApi";
import { currentAppReturnTo } from "@/lib/routing";
import type { CloudAuthProviders, CloudUser } from "@/types/cloud";

type GoogleCodeResponse = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient(config: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            state: string;
            callback: (response: GoogleCodeResponse) => void;
          }): { requestCode: () => void };
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Identity Services 加载失败")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Services 加载失败"));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

function requestGoogleCode(config: { clientId: string; scope: string; state: string }) {
  return new Promise<GoogleCodeResponse>((resolve) => {
    const client = window.google?.accounts.oauth2.initCodeClient({
      client_id: config.clientId,
      scope: config.scope,
      ux_mode: "popup",
      state: config.state,
      callback: resolve
    });
    client?.requestCode();
  });
}

export function useCloudAuth() {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [providers, setProviders] = useState<CloudAuthProviders>({ google: false, apple: false });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const result = await fetchCurrentUser();
      setUser(result.user);
      setProviders(result.providers);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(provider: "google" | "apple") {
    if (provider === "google") {
      setLoading(true);
      try {
        await loadGoogleIdentityScript();
        const config = await fetchGooglePopupConfig(currentAppReturnTo());
        const response = await requestGoogleCode(config);
        if (!response.code) throw new Error(response.error_description || response.error || "Google 没有返回授权码");
        await completeGooglePopupOAuth(response.code, response.state || config.state);
        await refresh();
      } finally {
        setLoading(false);
      }
      return;
    }
    const result = await fetchOAuthUrl(provider, currentAppReturnTo());
    window.location.assign(result.authUrl);
  }

  async function logout() {
    await logoutCloudUser();
    setUser(null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { user, providers, loading, login, logout, refresh };
}
