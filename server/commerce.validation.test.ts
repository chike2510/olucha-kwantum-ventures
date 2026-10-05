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

  it("requires an authenticated customer to initialize payment", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.payments.initialize({
      customerName: "Test Buyer",
      customerEmail: "buyer@example.com",
      customerPhone: "+2348000000000",
      deliveryCountry: "Nigeria",
      deliveryAddress: "1 Example Street, Lagos",
      items: [{ slug: "smart-home-essentials", quantity: 1 }],
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an invalid export inquiry status for administrators", async () => {
    const adminContext = {
      ...createContext(),
      user: { id: 1, openId: "admin", name: "Admin", email: "admin@example.com", role: "admin" } as TrpcContext["user"],
    };
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.updateInquiryStatus({ id: 1, status: "invalid" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
