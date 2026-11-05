import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers/index.js";
import { createContext } from "./context.js";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "./adminAuth.js";

describe("createContext Admin/customer identity separation", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_LOGIN_EMAIL", "admin@example.invalid");
    vi.stubEnv("ADMIN_LOGIN_PASSWORD", "test-only-admin-password");
    vi.stubEnv("JWT_SECRET", "test-only-session-signing-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a signed Admin cookie out of customer account routes and accepts it for Admin APIs", async () => {
    const request = {
      protocol: "https",
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(createAdminSession("admin@example.invalid"))}`,
      },
    } as CreateExpressContextOptions["req"];
    const context = await createContext({
      req: request,
      res: {} as CreateExpressContextOptions["res"],
      info: {} as CreateExpressContextOptions["info"],
    });
    const caller = appRouter.createCaller(context);

    expect(context.user).toBeNull();
    expect(context.adminUser).toMatchObject({ role: "admin", email: "admin@example.invalid" });
    await expect(caller.auth.me()).resolves.toBeNull();
    await expect(caller.account.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.account.orders()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.admin.cjSyncStatus()).resolves.toHaveProperty("previewEnvironment");
  });
});
