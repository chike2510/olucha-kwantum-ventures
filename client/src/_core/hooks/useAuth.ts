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
    if (!supabase) throw new Error("Sign-in is temporarily unavailable. Please try again later.");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;

    const verification = await meQuery.refetch();
    if (verification.error || !verification.data) {
      await supabase.auth.signOut();
      throw verification.error ?? new Error("We couldn’t complete your sign-in. Please try again.");
    }
    return verification.data;
  }, [meQuery.refetch]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (!supabase) throw new Error("Account creation is temporarily unavailable. Please try again later.");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: { full_name: name.trim() },
      },
    });
    if (error) throw error;

    // With email confirmation on, Supabase returns no session until the link is clicked.
    if (data.session) {
      await meQuery.refetch();
      return { needsConfirmation: false };
    }
    return { needsConfirmation: true };
  }, [meQuery.refetch]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error("Password reset is temporarily unavailable. Please try again later.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account?reset=1`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error("Password reset is temporarily unavailable. Please try again later.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    await meQuery.refetch();
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
    signUp,
    requestPasswordReset,
    updatePassword,
    logout,
  };
}
