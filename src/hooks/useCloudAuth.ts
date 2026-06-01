import { useEffect, useState } from "react";
import { fetchCurrentUser, fetchOAuthUrl, logoutCloudUser } from "@/services/cloudApi";
import { currentAppReturnTo } from "@/lib/routing";
import type { CloudAuthProviders, CloudUser } from "@/types/cloud";

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
