import { describe, expect, it } from "vitest";
import { isAdminCredentialValid } from "./_core/adminAuth";

describe("standalone admin authentication", () => {
  it("accepts the configured server-side credentials without exposing them", () => {
    expect(isAdminCredentialValid(process.env.ADMIN_LOGIN_EMAIL ?? "", process.env.ADMIN_LOGIN_PASSWORD ?? "")).toBe(true);
    expect(isAdminCredentialValid("wrong@example.com", "wrong-password")).toBe(false);
  });
});

