import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  getCheckoutProductsBySlug: vi.fn(),
  createPaymentIntent: vi.fn(),
  getPaymentIntent: vi.fn(),
  updatePaymentIntentStatus: vi.fn(),
  createPaidOrderFromIntent: vi.fn(),
}));

import {
  createPaidOrderFromIntent,
  createPaymentIntent,
  getCheckoutProductsBySlug,
  getPaymentIntent,
  updatePaymentIntentStatus,
} from "./repository.js";
import {
  calculateCheckoutTotals,
  createPaystackPaymentCompleter,
  initializePaymentCheckout,
} from "./checkout.js";
import { verifyPaystackTransaction } from "./paystack.js";

const TEST_KEY = "sk_test_unit_test_fixture_only";
const CHECKOUT_INPUT = {
  customerName: "Test Buyer",
  customerEmail: "buyer@example.com",
  customerPhone: "+2348000000000",
  deliveryCountry: "Nigeria",
  deliveryCountryCode: "NG",
  deliveryAddress: "1 Example Street, Lagos",
  deliveryAddress2: "",
  deliveryCity: "Lagos",
  deliveryRegion: "Lagos",
  deliveryPostalCode: "100001",
  coupon: "OLUCHA10",
  items: [{ slug: "sample-product", quantity: 2 }],
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Paystack checkout", () => {
  it("calculates shipping and coupon in integer minor units (VAT-inclusive prices, no tax added)", () => {
    expect(calculateCheckoutTotals(1_000_000, "olucha10")).toEqual({
      subtotalKobo: 1_000_000,
      discountKobo: 100_000,
      shippingKobo: 250_000,
      taxKobo: 0,
      totalKobo: 1_150_000,
    });
  });

  it("initializes from catalogue prices and persists an intent before redirecting", async () => {
    vi.mocked(getCheckoutProductsBySlug).mockResolvedValue([{
      id: 41,
      slug: "sample-product",
      name: "Server Priced Item",
      priceKobo: 500_000,
      currency: "NGN",
      isActive: 1,
      supplierMappingId: null,
      supplierStock: null,
      supplierStockSyncedAt: null,
    }]);
    vi.mocked(createPaymentIntent).mockResolvedValue(undefined);
    vi.mocked(updatePaymentIntentStatus).mockResolvedValue(undefined);

    let capturedRequest: RequestInit | undefined;
    const fetcher: typeof fetch = async (_input, init) => {
      capturedRequest = init;
      return jsonResponse({
        status: true,
        data: { reference: JSON.parse(String(init?.body)).reference, authorization_url: "https://checkout.paystack.com/test-checkout" },
      });
    };
    vi.stubGlobal("fetch", fetcher);

    const result = await initializePaymentCheckout(CHECKOUT_INPUT, 9, "https://preview.example", TEST_KEY);
    const requestBody = JSON.parse(String(capturedRequest?.body));
    const intent = vi.mocked(createPaymentIntent).mock.calls[0]?.[0];

    expect(requestBody.amount).toBe("1150000");
    expect(requestBody.currency).toBe("NGN");
    expect(requestBody.callback_url).toBe("https://preview.example/api/payments/paystack/callback");
    expect(requestBody.metadata.cancel_action).toContain("/api/payments/paystack/cancel?reference=");
    expect(new Headers(capturedRequest?.headers).get("Authorization")).toBe(`Bearer ${TEST_KEY}`);
    expect(intent?.lines).toEqual([{
      productId: 41,
      productName: "Server Priced Item",
      quantity: 2,
      unitPriceKobo: 500_000,
      variant: null,
    }]);
    expect(intent?.totalKobo).toBe(1_150_000);
    expect(intent?.customerEmail).toBe("buyer@example.com");
    expect(intent?.deliveryCountryCode).toBe("NG");
    expect(intent?.deliveryCity).toBe("Lagos");
    expect(intent?.deliveryRegion).toBe("Lagos");
    expect(result.authorizationUrl).toBe("https://checkout.paystack.com/test-checkout");
    expect(result.totalKobo).toBe(1_150_000);
    expect(updatePaymentIntentStatus).toHaveBeenCalledWith(result.reference, "pending");
  });

  it("refuses to initialize payment for a mapped product with stale CJ stock", async () => {
    vi.mocked(getCheckoutProductsBySlug).mockResolvedValue([{
      id: 41,
      slug: "sample-product",
      name: "Server Priced Item",
      priceKobo: 500_000,
      currency: "NGN",
      isActive: 1,
      supplierMappingId: 9,
      supplierStock: 50,
      supplierStockSyncedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    }]);
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);

    await expect(initializePaymentCheckout(CHECKOUT_INPUT, 9, "https://preview.example", TEST_KEY))
      .rejects.toThrow("One or more items are no longer in stock.");
    expect(fetcher).not.toHaveBeenCalled();
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it("refuses quantities above the last synced CJ stock before payment starts", async () => {
    vi.mocked(getCheckoutProductsBySlug).mockResolvedValue([{
      id: 41,
      slug: "sample-product",
      name: "Server Priced Item",
      priceKobo: 500_000,
      currency: "NGN",
      isActive: 1,
      supplierMappingId: 9,
      supplierStock: 1,
      supplierStockSyncedAt: new Date(),
    }]);
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);

    await expect(initializePaymentCheckout(CHECKOUT_INPUT, 9, "https://preview.example", TEST_KEY))
      .rejects.toThrow("One or more items are no longer in stock.");
    expect(fetcher).not.toHaveBeenCalled();
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it("refuses non-test credentials before reading the catalogue or making an HTTP call", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    await expect(initializePaymentCheckout(CHECKOUT_INPUT, 9, "https://preview.example", "sk_live_not_allowed"))
      .rejects.toThrow("Online payment is not available right now. Please try again later.");
    expect(getCheckoutProductsBySlug).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("creates an order only after successful verification matches reference, test domain, amount and currency", async () => {
    const fetcher: typeof fetch = async () => jsonResponse({
      status: true,
      data: { reference: "okv-test-reference", status: "success", amount: 1_150_000, currency: "NGN", domain: "test" },
    });
    const createPaidOrder = vi.fn().mockResolvedValue({ orderId: 73, created: true });
    const onVerifiedLivePayment = vi.fn().mockResolvedValue(undefined);
    const completer = createPaystackPaymentCompleter({
      getIntent: async () => ({ reference: "okv-test-reference", totalKobo: 1_150_000, currency: "NGN" }),
      verifyTransaction: (secret, reference) => verifyPaystackTransaction(secret, reference, fetcher),
      updateIntentStatus: vi.fn().mockResolvedValue(undefined),
      createPaidOrder,
      onVerifiedLivePayment,
    });

    await expect(completer("okv-test-reference", TEST_KEY)).resolves.toEqual({ outcome: "success", orderId: 73 });
    expect(createPaidOrder).toHaveBeenCalledWith("okv-test-reference", "test");
    expect(onVerifiedLivePayment).not.toHaveBeenCalled();
  });

  it("calls the supplier-order hook only after a server-verified live transaction is persisted", async () => {
    vi.stubEnv("PAYSTACK_LIVE_ENABLED", "true");
    const liveKey = "sk_live_unit_test_fixture_only";
    const createPaidOrder = vi.fn().mockResolvedValue({ orderId: 74, created: true });
    const onVerifiedLivePayment = vi.fn().mockResolvedValue(undefined);
    const fetcher: typeof fetch = async () => jsonResponse({
      status: true,
      data: { reference: "okv-live-reference", status: "success", amount: 1_150_000, currency: "NGN", domain: "live" },
    });
    const completer = createPaystackPaymentCompleter({
      getIntent: async () => ({ reference: "okv-live-reference", totalKobo: 1_150_000, currency: "NGN" }),
      verifyTransaction: (secret, reference) => verifyPaystackTransaction(secret, reference, fetcher),
      updateIntentStatus: vi.fn().mockResolvedValue(undefined),
      createPaidOrder,
      onVerifiedLivePayment,
    });

    await expect(completer("okv-live-reference", liveKey)).resolves.toEqual({ outcome: "success", orderId: 74 });
    expect(createPaidOrder).toHaveBeenCalledWith("okv-live-reference", "live");
    expect(onVerifiedLivePayment).toHaveBeenCalledWith(74);
  });

  it("does not create an order when Paystack returns a mismatched amount", async () => {
    const createPaidOrder = vi.fn().mockResolvedValue({ orderId: 73, created: true });
    const updateStatus = vi.fn().mockResolvedValue(undefined);
    const fetcher: typeof fetch = async () => jsonResponse({
      status: true,
      data: { reference: "okv-test-reference", status: "success", amount: 1, currency: "NGN", domain: "test" },
    });
    const completer = createPaystackPaymentCompleter({
      getIntent: async () => ({ reference: "okv-test-reference", totalKobo: 1_150_000, currency: "NGN" }),
      verifyTransaction: (secret, reference) => verifyPaystackTransaction(secret, reference, fetcher),
      updateIntentStatus: updateStatus,
      createPaidOrder,
    });

    await expect(completer("okv-test-reference", TEST_KEY)).resolves.toEqual({ outcome: "failed" });
    expect(createPaidOrder).not.toHaveBeenCalled();
    expect(updateStatus).toHaveBeenCalledWith("okv-test-reference", "failed");
  });

  it("does not create an order for a live-domain transaction even when other fields match", async () => {
    const createPaidOrder = vi.fn().mockResolvedValue({ orderId: 73, created: true });
    const fetcher: typeof fetch = async () => jsonResponse({
      status: true,
      data: { reference: "okv-test-reference", status: "success", amount: 1_150_000, currency: "NGN", domain: "live" },
    });
    const completer = createPaystackPaymentCompleter({
      getIntent: async () => ({ reference: "okv-test-reference", totalKobo: 1_150_000, currency: "NGN" }),
      verifyTransaction: (secret, reference) => verifyPaystackTransaction(secret, reference, fetcher),
      updateIntentStatus: vi.fn().mockResolvedValue(undefined),
      createPaidOrder,
    });

    await expect(completer("okv-test-reference", TEST_KEY)).resolves.toEqual({ outcome: "failed" });
    expect(createPaidOrder).not.toHaveBeenCalled();
  });

  it("does not verify an unknown payment intent", async () => {
    vi.mocked(getPaymentIntent).mockResolvedValue(null);
    const completer = createPaystackPaymentCompleter({
      getIntent: getPaymentIntent,
      verifyTransaction: vi.fn(),
      updateIntentStatus: updatePaymentIntentStatus,
      createPaidOrder: createPaidOrderFromIntent,
    });
    await expect(completer("okv-unknown", TEST_KEY)).resolves.toEqual({ outcome: "unknown" });
    expect(createPaidOrderFromIntent).not.toHaveBeenCalled();
  });
});
