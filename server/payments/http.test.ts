import { describe, expect, it, vi } from "vitest";
import { createPaystackHttpHandler, type PaymentHttpDependencies } from "./http.js";

function makeHandler(overrides: Partial<PaymentHttpDependencies> = {}) {
  const dependencies: PaymentHttpDependencies = {
    getSecretKey: () => "sk_test_http_fixture_only",
    verifySignature: vi.fn(async (body, signature) => body.length > 0 && signature === "valid-signature"),
    completePayment: vi.fn().mockResolvedValue({ outcome: "success", orderId: 81 }),
    markCancelled: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { handler: createPaystackHttpHandler(dependencies), dependencies };
}

describe("Paystack Worker HTTP routes", () => {
  it("validates the untouched webhook body before forwarding charge.success", async () => {
    const { handler, dependencies } = makeHandler();
    const rawBody = '{"event":"charge.success","data":{"reference":"okv-http-test"}}';
    const response = await handler(new Request("https://preview.example/api/payments/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "valid-signature", "content-type": "application/json" },
      body: rawBody,
    }));

    expect(response?.status).toBe(200);
    expect(dependencies.verifySignature).toHaveBeenCalledWith(rawBody, "valid-signature", "sk_test_http_fixture_only");
    expect(dependencies.completePayment).toHaveBeenCalledWith("okv-http-test", "sk_test_http_fixture_only");
  });

  it("rejects an invalid webhook signature without verifying or creating an order", async () => {
    const { handler, dependencies } = makeHandler();
    const response = await handler(new Request("https://preview.example/api/payments/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "invalid" },
      body: '{"event":"charge.success","data":{"reference":"okv-http-test"}}',
    }));

    expect(response?.status).toBe(401);
    expect(dependencies.completePayment).not.toHaveBeenCalled();
  });

  it("returns a safe verified-success redirect without putting the transaction reference in the browser URL", async () => {
    const { handler } = makeHandler();
    const response = await handler(new Request("https://preview.example/api/payments/paystack/callback?reference=okv-http-test"));
    const location = response?.headers.get("Location");

    expect(response?.status).toBe(303);
    expect(location).toBe("https://preview.example/checkout?payment=success&order=81");
  });

  it("shows failure without creating an order when server verification fails", async () => {
    const { handler, dependencies } = makeHandler({ completePayment: vi.fn().mockResolvedValue({ outcome: "failed" }) });
    const response = await handler(new Request("https://preview.example/api/payments/paystack/callback?reference=okv-http-test"));

    expect(response?.headers.get("Location")).toBe("https://preview.example/checkout?payment=failed");
    expect(dependencies.completePayment).toHaveBeenCalledOnce();
  });

  it("routes webhook redelivery through the unique-reference fulfillment boundary", async () => {
    const fulfilledReferences = new Set<string>();
    const createOrderOnce = vi.fn();
    const completePayment = vi.fn(async (reference: string) => {
      if (!fulfilledReferences.has(reference)) {
        fulfilledReferences.add(reference);
        createOrderOnce(reference);
      }
      return { outcome: "success" as const, orderId: 82 };
    });
    const { handler } = makeHandler({ completePayment });
    const body = '{"event":"charge.success","data":{"reference":"okv-http-test"}}';
    const sendWebhook = () => handler(new Request("https://preview.example/api/payments/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "valid-signature" },
      body,
    }));

    await sendWebhook();
    await sendWebhook();

    expect(completePayment).toHaveBeenCalledTimes(2);
    expect(createOrderOnce).toHaveBeenCalledTimes(1);
  });

  it("treats cancel_action as a UX-only path and never verifies or creates an order", async () => {
    const { handler, dependencies } = makeHandler();
    const response = await handler(new Request("https://preview.example/api/payments/paystack/cancel?reference=okv-http-test"));

    expect(response?.headers.get("Location")).toBe("https://preview.example/checkout?payment=cancelled");
    expect(dependencies.markCancelled).toHaveBeenCalledWith("okv-http-test");
    expect(dependencies.completePayment).not.toHaveBeenCalled();
  });

  it("returns 503 for transient webhook verification/database errors so Paystack can retry", async () => {
    const { handler } = makeHandler({ completePayment: vi.fn().mockRejectedValue(new Error("temporary failure")) });
    const response = await handler(new Request("https://preview.example/api/payments/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "valid-signature" },
      body: '{"event":"charge.success","data":{"reference":"okv-http-test"}}',
    }));

    expect(response?.status).toBe(503);
  });
});
