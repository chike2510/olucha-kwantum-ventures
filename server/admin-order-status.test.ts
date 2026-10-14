import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { allowedManualTransitions, canManuallyTransition } from "../shared/orderStatus";

const dbMocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  updateOrderStatusFrom: vi.fn(),
}));

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getOrderById: dbMocks.getOrderById, updateOrderStatusFrom: dbMocks.updateOrderStatusFrom };
});

const { appRouter } = await import("./routers");

function adminCaller() {
  const ctx: TrpcContext = {
    user: { id: 1, openId: "admin", name: "Admin", email: "admin@example.com", role: "admin" } as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

const order = (status: string) => ({ id: 7, status });

describe("manual order status transitions", () => {
  it("only allows the fulfilment chain and cancellation", () => {
    expect(allowedManualTransitions("pending")).toEqual(["cancelled"]);
    expect(allowedManualTransitions("paid")).toEqual(["processing", "cancelled"]);
    expect(allowedManualTransitions("processing")).toEqual(["shipped", "cancelled"]);
    expect(allowedManualTransitions("shipped")).toEqual(["delivered", "cancelled"]);
    expect(allowedManualTransitions("delivered")).toEqual([]);
    expect(canManuallyTransition("pending", "paid")).toBe(false);
    expect(canManuallyTransition("paid", "shipped")).toBe(false);
  });
});

describe("admin.updateOrderStatus", () => {
  beforeEach(() => {
    dbMocks.getOrderById.mockReset();
    dbMocks.updateOrderStatusFrom.mockReset();
    dbMocks.updateOrderStatusFrom.mockResolvedValue({ success: true });
  });

  it("refuses to mark an order paid by hand", async () => {
    dbMocks.getOrderById.mockResolvedValue(order("pending"));
    await expect(adminCaller().admin.updateOrderStatus({ id: 7, status: "paid" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.updateOrderStatusFrom).not.toHaveBeenCalled();
  });

  it.each(["processing", "shipped", "delivered"] as const)("refuses to move a pending order to %s", async (status) => {
    dbMocks.getOrderById.mockResolvedValue(order("pending"));
    await expect(adminCaller().admin.updateOrderStatus({ id: 7, status })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.updateOrderStatusFrom).not.toHaveBeenCalled();
  });

  it("refuses to skip fulfilment steps or reopen delivered orders", async () => {
    dbMocks.getOrderById.mockResolvedValue(order("paid"));
    await expect(adminCaller().admin.updateOrderStatus({ id: 7, status: "delivered" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    dbMocks.getOrderById.mockResolvedValue(order("delivered"));
    await expect(adminCaller().admin.updateOrderStatus({ id: 7, status: "cancelled" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.updateOrderStatusFrom).not.toHaveBeenCalled();
  });

  it.each([
    ["paid", "processing"],
    ["processing", "shipped"],
    ["shipped", "delivered"],
    ["pending", "cancelled"],
    ["paid", "cancelled"],
  ] as const)("allows %s → %s", async (from, to) => {
    dbMocks.getOrderById.mockResolvedValue(order(from));
    await expect(adminCaller().admin.updateOrderStatus({ id: 7, status: to })).resolves.toMatchObject({ success: true, status: to });
    expect(dbMocks.updateOrderStatusFrom).toHaveBeenCalledWith(7, from, to);
  });

  it("returns NOT_FOUND for an unknown order", async () => {
    dbMocks.getOrderById.mockResolvedValue(null);
    await expect(adminCaller().admin.updateOrderStatus({ id: 99, status: "cancelled" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects non-admin callers", async () => {
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.admin.updateOrderStatus({ id: 7, status: "cancelled" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
