import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { isSupabaseAuthConfigured, supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const logoutMutation = trpc.auth.logout.useMutation();

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase Auth is not configured for this Preview.");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;

    const verification = await meQuery.refetch();
    if (verification.error || !verification.data) {
      await supabase.auth.signOut();
      throw verification.error ?? new Error("The Preview app could not verify this Supabase session.");
    }
    return verification.data;
  }, [meQuery.refetch]);

  const logout = useCallback(async () => {
    try {
      await supabase?.auth.signOut();
    } finally {
      // Also clear a legacy app cookie if one exists from an earlier Preview session.
      try {
        await logoutMutation.mutateAsync();
      } catch {
        // Local Supabase sign-out must still complete if the API is unavailable.
      }
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => ({
    user: meQuery.data ?? null,
    loading: meQuery.isLoading || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  }), [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user || typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;
    startLogin(redirectPath);
  }, [redirectOnUnauthenticated, redirectPath, logoutMutation.isPending, meQuery.isLoading, state.user]);

  return {
    ...state,
    authConfigured: isSupabaseAuthConfigured,
    refresh: () => meQuery.refetch(),
    signIn,
    logout,
  };
}
