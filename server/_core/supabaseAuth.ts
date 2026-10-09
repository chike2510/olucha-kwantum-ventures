export type SupabaseAuthUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
};

type VerificationOptions = {
  url: string;
  publishableKey: string;
  fetcher?: typeof fetch;
};

/**
 * Verify an access token with this project's Supabase Auth endpoint. The key is
 * intentionally a publishable key; no service-role credential is ever used.
 */
export async function verifySupabaseAccessToken(
  accessToken: string,
  options: VerificationOptions,
): Promise<SupabaseAuthUser | null> {
  if (!accessToken || !options.url || !options.publishableKey) return null;

  let endpoint: string;
  try {
    endpoint = new URL("/auth/v1/user", options.url).toString();
  } catch {
    return null;
  }

  const fetcher = options.fetcher ?? globalThis.fetch;
  try {
    const response = await fetcher(endpoint, {
      method: "GET",
      headers: {
        apikey: options.publishableKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const candidate = payload as Record<string, unknown>;
    if (typeof candidate.id !== "string" || candidate.id.length === 0) return null;

    const metadata = candidate.user_metadata;
    return {
      id: candidate.id,
      email: typeof candidate.email === "string" ? candidate.email : null,
      user_metadata: metadata && typeof metadata === "object"
        ? metadata as Record<string, unknown>
        : {},
    };
  } catch {
    return null;
  }
}
