import { afterEach, describe, expect, it, vi } from "vitest";
import { createPaystackPaymentCompleter } from "./checkout.js";
import { createPaystackHttpHandler } from "./http.js";
import {
  getAllowedPaystackMode,
  initializePaystackTransaction,
  isPaystackKeyAllowed,
  isPaystackLiveEnabled,
  matchesVerifiedPayment,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
  type PaystackTransaction,
} from "./paystack.js";

vi.mock("./repository.js", () => ({
  getCheckoutProductsBySlug: vi.fn(),
  createPaymentIntent: vi.fn(),
  getPaymentIntent: vi.fn(),
  updatePaymentIntentStatus: vi.fn(),
  createPaidOrderFromIntent: vi.fn(),
}));

const TEST_KEY = "sk_test_live_gate_fixture_only";
const LIVE_KEY = "sk_live_live_gate_fixture_only";
const INTENT = { reference: "okv-gate", totalKobo: 250_000, currency: "NGN" };
const INIT_INPUT = {
  email: "buyer@example.com",
  amountKobo: 250_000,
  currency: "NGN",
  reference: "okv-gate",
  callbackUrl: "https://preview.example/api/payments/paystack/callback",
  cancelActionUrl: "https://preview.example/api/payments/paystack/cancel?reference=okv-gate",
};

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
}

function transaction(overrides: Partial<PaystackTransaction> = {}): PaystackTransaction {
  return { reference: "okv-gate", status: "success", amount: 250_000, currency: "NGN", domain: "test", ...overrides };
}

function completerFor(verified: PaystackTransaction) {
  const createPaidOrder = vi.fn().mockResolvedValue({ orderId: 5, created: true });
  const updateIntentStatus = vi.fn().mockResolvedValue(undefined);
  const verifyTransaction = vi.fn((secret: string, reference: string) =>
    verifyPaystackTransaction(secret, reference, async () => jsonResponse({ status: true, data: verified })));
  const complete = createPaystackPaymentCompleter({
    getIntent: async () => INTENT,
    verifyTransaction,
    updateIntentStatus,
    createPaidOrder,
  });
  return { complete, createPaidOrder, updateIntentStatus, verifyTransaction };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Paystack live-key gate (PAYSTACK_LIVE_ENABLED unset)", () => {
  it("is off unless the variable is exactly \"true\"", () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "");
    expect(isPaystackLiveEnabled()).toBe(false);
    for (const value of ["TRUE", "1", "yes", "true ", " true"]) {
      vi.stubEnv("PAYSTACK_LIVE_ENABLED", value);
      expect(isPaystackLiveEnabled()).toBe(false);
      expect(isPaystackKeyAllowed(LIVE_KEY)).toBe(false);
    }
  });

  it("accepts only test keys", () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "");
    expect(getAllowedPaystackMode(TEST_KEY)).toBe("test");
    expect(getAllowedPaystackMode(LIVE_KEY)).toBeNull();
    expect(getAllowedPaystackMode("pk_test_public")).toBeNull();
    expect(getAllowedPaystackMode("")).toBeNull();
  });

  it("refuses to initialize or verify with a live key before any network call", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "");
    const fetcher = vi.fn<typeof fetch>();
    await expect(initializePaystackTransaction(LIVE_KEY, INIT_INPUT, fetcher)).rejects.toThrow("Online payment is not available");
    await expect(verifyPaystackTransaction(LIVE_KEY, "okv-gate", fetcher)).rejects.toThrow("Online payment is not available");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not complete a payment with a live key", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "");
    const { complete, createPaidOrder, verifyTransaction } = completerFor(transaction({ domain: "live" }));
    await expect(complete("okv-gate", LIVE_KEY)).rejects.toThrow("Online payment is not available");
    expect(verifyTransaction).not.toHaveBeenCalled();
    expect(createPaidOrder).not.toHaveBeenCalled();
  });

  it("rejects webhook signatures made with a live key", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "");
    const body = '{"event":"charge.success"}';
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(LIVE_KEY), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
    const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))), (b) => b.toString(16).padStart(2, "0")).join("");
    expect(await verifyPaystackWebhookSignature(body, sig, LIVE_KEY)).toBe(false);
  });

  it("keeps the callback and webhook routes closed for a live key", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "");
    const completePayment = vi.fn();
    const handle = createPaystackHttpHandler({
      getSecretKey: () => LIVE_KEY,
      verifySignature: vi.fn().mockResolvedValue(true),
      completePayment,
      markCancelled: vi.fn().mockResolvedValue(undefined),
    });
    const callback = await handle(new Request("https://preview.example/api/payments/paystack/callback?reference=okv-gate"));
    expect(callback?.headers.get("Location")).toContain("payment=pending");
    const webhook = await handle(new Request("https://preview.example/api/payments/paystack/webhook", { method: "POST", body: "{}" }));
    expect(webhook?.status).toBe(503);
    expect(completePayment).not.toHaveBeenCalled();
  });
});

describe("Paystack live-key gate (PAYSTACK_LIVE_ENABLED=true)", () => {
  it("accepts live and test keys", () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "true");
    expect(isPaystackLiveEnabled()).toBe(true);
    expect(getAllowedPaystackMode(LIVE_KEY)).toBe("live");
    expect(getAllowedPaystackMode(TEST_KEY)).toBe("test");
    expect(getAllowedPaystackMode("sk_other")).toBeNull();
  });

  it("initializes with a live key", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "true");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      status: true,
      data: { authorization_url: "https://checkout.paystack.com/live-token", reference: "okv-gate" },
    }));
    await expect(initializePaystackTransaction(LIVE_KEY, INIT_INPUT, fetcher)).resolves.toMatchObject({ reference: "okv-gate" });
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe(`Bearer ${LIVE_KEY}`);
  });

  it("completes a live-domain transaction verified with a live key", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "true");
    const { complete, createPaidOrder } = completerFor(transaction({ domain: "live" }));
    await expect(complete("okv-gate", LIVE_KEY)).resolves.toEqual({ outcome: "success", orderId: 5 });
    expect(createPaidOrder).toHaveBeenCalledWith("okv-gate", "live");
  });

  it("rejects a test-domain transaction verified with a live key", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "true");
    const { complete, createPaidOrder, updateIntentStatus } = completerFor(transaction({ domain: "test" }));
    await expect(complete("okv-gate", LIVE_KEY)).resolves.toEqual({ outcome: "failed" });
    expect(createPaidOrder).not.toHaveBeenCalled();
    expect(updateIntentStatus).toHaveBeenCalledWith("okv-gate", "failed");
  });

  it("rejects a live-domain transaction verified with a test key", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "true");
    const { complete, createPaidOrder } = completerFor(transaction({ domain: "live" }));
    await expect(complete("okv-gate", TEST_KEY)).resolves.toEqual({ outcome: "failed" });
    expect(createPaidOrder).not.toHaveBeenCalled();
  });

  it.each([
    ["amount", { amount: 249_999 }],
    ["currency", { currency: "USD" }],
    ["reference", { reference: "okv-other" }],
  ])("rejects a live transaction with a mismatched %s", async (_field, overrides) => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "true");
    const { complete, createPaidOrder } = completerFor(transaction({ domain: "live", ...overrides }));
    await expect(complete("okv-gate", LIVE_KEY)).resolves.toEqual({ outcome: "failed" });
    expect(createPaidOrder).not.toHaveBeenCalled();
  });
});

describe("matchesVerifiedPayment", () => {
  const expected = { reference: "okv-gate", amountKobo: 250_000, currency: "NGN" };

  it("requires the transaction domain to equal the key mode", () => {
    expect(matchesVerifiedPayment(transaction({ domain: "test" }), { ...expected, mode: "test" })).toBe(true);
    expect(matchesVerifiedPayment(transaction({ domain: "live" }), { ...expected, mode: "live" })).toBe(true);
    expect(matchesVerifiedPayment(transaction({ domain: "live" }), { ...expected, mode: "test" })).toBe(false);
    expect(matchesVerifiedPayment(transaction({ domain: "test" }), { ...expected, mode: "live" })).toBe(false);
  });

  it("checks amount, currency, reference and status in both modes", () => {
    for (const mode of ["test", "live"] as const) {
      const base = transaction({ domain: mode });
      expect(matchesVerifiedPayment({ ...base, amount: 1 }, { ...expected, mode })).toBe(false);
      expect(matchesVerifiedPayment({ ...base, currency: "GHS" }, { ...expected, mode })).toBe(false);
      expect(matchesVerifiedPayment({ ...base, reference: "x" }, { ...expected, mode })).toBe(false);
      expect(matchesVerifiedPayment({ ...base, status: "abandoned" }, { ...expected, mode })).toBe(false);
    }
  });
});
