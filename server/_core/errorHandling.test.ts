import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import { expressErrorHandler, formatTrpcError, GENERIC_SERVER_ERROR_MESSAGE } from "./errorHandling.js";

const shape = (message: string) => ({
  message,
  code: -32603,
  data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path: "x", stack: "Error: boom\n    at secret.ts:1:1" },
});

describe("formatTrpcError", () => {
  it("strips the stack and hides unexpected error messages outside development", () => {
    const error = new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "relation \"users\" does not exist", cause: new Error("db") });
    const formatted = formatTrpcError({ shape: shape(error.message), error }, false);
    expect(formatted.data).not.toHaveProperty("stack");
    expect(formatted.message).toBe(GENERIC_SERVER_ERROR_MESSAGE);
  });

  it("keeps deliberate user-facing messages outside development", () => {
    const error = new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
    const formatted = formatTrpcError({ shape: { ...shape(error.message), data: { ...shape("").data, code: "NOT_FOUND" } }, error }, false);
    expect(formatted.message).toBe("Order not found.");
    expect(formatted.data).not.toHaveProperty("stack");
  });

  it("leaves everything in development", () => {
    const error = new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "boom", cause: new Error("boom") });
    expect(formatTrpcError({ shape: shape("boom"), error }, true).data.stack).toContain("secret.ts");
  });
});

describe("expressErrorHandler", () => {
  it("returns a generic body without a stack", () => {
    vi.stubEnv("NODE_ENV", "production");
    const json = vi.fn();
    const res = { headersSent: false, status: vi.fn(() => ({ json })) } as any;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expressErrorHandler(new Error("secret detail"), { method: "GET", originalUrl: "/api/x" } as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Internal server error" });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
    vi.unstubAllEnvs();
  });
});
