import { useCallback, useEffect, useState } from "react";

type AdminUser = { role: "admin"; email: string; name: string };

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/session", { credentials: "include" });
      const data = await response.json() as { authenticated?: boolean; email?: string };
      setUser(data.authenticated && data.email ? { role: "admin", email: data.email, name: "Olucha Administrator" } : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) });
    if (!response.ok) {
      setError("The administrator email or password is not valid.");
      return false;
    }
    await refresh();
    return true;
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  return { user, loading, error, login, logout, refresh };
}
