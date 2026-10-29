import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminCredentialValid } from "./_core/adminAuth";

describe("standalone admin authentication", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts the configured server-side credentials without exposing them", () => {
    vi.stubEnv("ADMIN_LOGIN_EMAIL", "admin-test@example.invalid");
    vi.stubEnv("ADMIN_LOGIN_PASSWORD", "unit-test-password-only");
    vi.stubEnv("JWT_SECRET", "test-only-session-signing-secret");
    expect(isAdminCredentialValid("admin-test@example.invalid", "unit-test-password-only")).toBe(true);
    expect(isAdminCredentialValid("wrong@example.com", "wrong-password")).toBe(false);
  });
});
