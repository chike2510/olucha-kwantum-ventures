import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("commerce input validation", () => {
  it("rejects an invalid export inquiry email", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.inquiries.create({
      fullName: "Test Buyer",
      email: "not-an-email",
      productInterest: "Dried ginger",
      destinationCountry: "Nigeria",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an empty contact message", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.contact.create({
      fullName: "Test Buyer",
      email: "buyer@example.com",
      message: "",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an order with no line items", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.account.createOrder({
      customerName: "Test Buyer",
      customerEmail: "buyer@example.com",
      totalKobo: 5000,
      lines: [],
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
