import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getAdminSessionFromRequest } from "./adminAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  const adminSession = getAdminSessionFromRequest(opts.req);
  if (adminSession) {
    user = {
      id: 0,
      openId: "env-admin",
      name: "Olucha Administrator",
      email: adminSession.email,
      loginMethod: "environment-admin",
      role: "admin",
      createdAt: new Date(0),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  }

  try {
    if (!user) user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
