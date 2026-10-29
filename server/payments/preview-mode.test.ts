import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllowedPaystackMode } from "./paystack.js";

afterEach(() => vi.unstubAllEnvs());

describe("Preview payment mode", () => {
  it("rejects live keys even if live mode is explicitly enabled", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "true");
    expect(getAllowedPaystackMode("sk_live_disposable_test_value", true)).toBeNull();
    expect(getAllowedPaystackMode("sk_live_disposable_test_value")).toBeNull();
    expect(getAllowedPaystackMode("sk_test_disposable_test_value")).toBe("test");
  });
});
