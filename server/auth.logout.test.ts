import { describe, expect, it } from "vitest";
import { appRouter } from "./routers/index";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("keeps an Admin-only session separate from customer account routes", async () => {
    const { ctx } = createAuthContext();
    const adminUser: AuthenticatedUser = {
      ...ctx.user!,
      id: 0,
      openId: "env-admin",
      name: "Olucha Administrator",
      role: "admin",
    };
    const adminCaller = appRouter.createCaller({ ...ctx, user: null, adminUser });

    await expect(adminCaller.auth.me()).resolves.toBeNull();
    await expect(adminCaller.account.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(adminCaller.account.orders()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(adminCaller.admin.cjSyncStatus()).resolves.toHaveProperty("previewEnvironment");

    const dualSessionCaller = appRouter.createCaller({ ...ctx, adminUser });
    await expect(dualSessionCaller.auth.me()).resolves.toEqual(ctx.user);
    await expect(dualSessionCaller.admin.cjSyncStatus()).resolves.toHaveProperty("previewEnvironment");
  });
});
