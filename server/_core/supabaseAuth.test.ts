import { describe, expect, it } from "vitest";
import { verifySupabaseAccessToken } from "./supabaseAuth.js";

describe("verifySupabaseAccessToken", () => {
  it("validates a bearer token through the project's Auth user endpoint", async () => {
    let requestedUrl = "";
    let requestedHeaders = new Headers();
    const fetcher: typeof fetch = async (input, init) => {
      requestedUrl = String(input);
      requestedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({
        id: "f46051c3-ef63-4c16-8576-c05eae8599a2",
        email: "preview@example.test",
        user_metadata: { full_name: "Preview Customer" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const user = await verifySupabaseAccessToken("test-access-token", {
      url: "https://zmaysbnlgctesemrhkqw.supabase.co",
      publishableKey: "sb_publishable_test",
      fetcher,
    });

    expect(requestedUrl).toBe("https://zmaysbnlgctesemrhkqw.supabase.co/auth/v1/user");
    expect(requestedHeaders.get("apikey")).toBe("sb_publishable_test");
    expect(requestedHeaders.get("authorization")).toBe("Bearer test-access-token");
    expect(user).toMatchObject({
      id: "f46051c3-ef63-4c16-8576-c05eae8599a2",
      email: "preview@example.test",
      user_metadata: { full_name: "Preview Customer" },
    });
  });

  it("rejects tokens that Supabase Auth does not verify", async () => {
    const fetcher: typeof fetch = async () => new Response("{}", { status: 401 });
    const user = await verifySupabaseAccessToken("invalid-token", {
      url: "https://zmaysbnlgctesemrhkqw.supabase.co",
      publishableKey: "sb_publishable_test",
      fetcher,
    });
    expect(user).toBeNull();
  });

  it("does not call out when auth configuration is missing", async () => {
    let called = false;
    const fetcher: typeof fetch = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    const user = await verifySupabaseAccessToken("token", {
      url: "",
      publishableKey: "sb_publishable_test",
      fetcher,
    });
    expect(user).toBeNull();
    expect(called).toBe(false);
  });
});
