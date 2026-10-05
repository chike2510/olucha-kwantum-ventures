import { describe, expect, it, vi } from "vitest";
import {
  initializePaystackTransaction,
  matchesVerifiedPayment,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
} from "./paystack.js";

const TEST_KEY = "sk_test_provider_fixture_only";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

async function signBody(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("Paystack API client", () => {
  it("initializes only with test keys and posts the amount/reference from the server", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      status: true,
      data: { authorization_url: "https://checkout.paystack.com/test-token", reference: "okv-test" },
    }));
    const result = await initializePaystackTransaction(TEST_KEY, {
      email: "buyer@example.com",
      amountKobo: 123_450,
      currency: "NGN",
      reference: "okv-test",
      callbackUrl: "https://preview.example/api/payments/paystack/callback",
      cancelActionUrl: "https://preview.example/api/payments/paystack/cancel?reference=okv-test",
    }, fetcher);
    const [, request] = fetcher.mock.calls[0]!;
    const body = JSON.parse(String(request?.body));

    expect(result).toEqual({ authorizationUrl: "https://checkout.paystack.com/test-token", reference: "okv-test" });
    expect(body.amount).toBe("123450");
    expect(body.reference).toBe("okv-test");
    expect(body.callback_url).toContain("/callback");
    expect(body.metadata.cancel_action).toContain("/cancel");
    expect(new Headers(request?.headers).get("Authorization")).toBe(`Bearer ${TEST_KEY}`);
  });

  it("rejects a live key before any network call", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(initializePaystackTransaction("sk_live_forbidden", {
      email: "buyer@example.com",
      amountKobo: 100,
      currency: "NGN",
      reference: "okv-test",
      callbackUrl: "https://preview.example/callback",
      cancelActionUrl: "https://preview.example/cancel",
    }, fetcher)).rejects.toThrow("Paystack test mode is not configured.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a provider URL outside Paystack hosted checkout", async () => {
    const fetcher: typeof fetch = async () => jsonResponse({
      status: true,
      data: { authorization_url: "https://attacker.example/collect", reference: "okv-test" },
    });
    await expect(initializePaystackTransaction(TEST_KEY, {
      email: "buyer@example.com",
      amountKobo: 100,
      currency: "NGN",
      reference: "okv-test",
      callbackUrl: "https://preview.example/callback",
      cancelActionUrl: "https://preview.example/cancel",
    }, fetcher)).rejects.toThrow("Paystack request failed.");
  });

  it("verifies a transaction reference server-side and checks all order fields", async () => {
    const fetcher: typeof fetch = async () => jsonResponse({
      status: true,
      data: { reference: "okv-test", status: "success", amount: 123_450, currency: "NGN", domain: "test" },
    });
    const transaction = await verifyPaystackTransaction(TEST_KEY, "okv-test", fetcher);
    expect(transaction).toMatchObject({ reference: "okv-test", status: "success", amount: 123_450, currency: "NGN", domain: "test" });
    expect(matchesVerifiedPayment(transaction, { reference: "okv-test", amountKobo: 123_450, currency: "ngn" })).toBe(true);
    expect(matchesVerifiedPayment(transaction, { reference: "different", amountKobo: 123_450, currency: "NGN" })).toBe(false);
    expect(matchesVerifiedPayment(transaction, { reference: "okv-test", amountKobo: 123_451, currency: "NGN" })).toBe(false);
  });

  it("checks Paystack's HMAC-SHA512 against the exact raw body", async () => {
    const rawBody = '{ "event":"charge.success", "data":{"reference":"okv-test"} }';
    const signature = await signBody(rawBody, TEST_KEY);
    expect(await verifyPaystackWebhookSignature(rawBody, signature, TEST_KEY)).toBe(true);
    expect(await verifyPaystackWebhookSignature(`${rawBody} `, signature, TEST_KEY)).toBe(false);
    expect(await verifyPaystackWebhookSignature(rawBody, signature, "sk_live_forbidden")).toBe(false);
  });
});
