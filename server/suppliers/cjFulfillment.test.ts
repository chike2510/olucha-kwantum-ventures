import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  claimCjSupplierOrder: vi.fn(),
  claimCjSupplierOrderRetry: vi.fn(),
  getCjSupplierOrder: vi.fn(),
  saveCjOrderReconciliation: vi.fn(),
  saveCjSupplierOrderResult: vi.fn(),
  saveCjTracking: vi.fn(),
  setCjSupplierOrderState: vi.fn(),
}));
const cjMocks = vi.hoisted(() => ({
  createSupplierOrder: vi.fn(),
  getOrderDetail: vi.fn(),
  getTrackingInfo: vi.fn(),
}));

vi.mock("../db.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db.js")>();
  return { ...actual, ...dbMocks };
});
vi.mock("./cj.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./cj.js")>();
  return { ...actual, createCjClient: vi.fn(() => cjMocks as unknown as ReturnType<typeof actual.createCjClient>) };
});

const { submitCjOrderForVerifiedPayment, reconcileCjSupplierOrder, retryCjSupplierOrder, syncCjTrackingForOrder } = await import("./cjFulfillment.js");
const { CjOrderSubmissionUncertainError } = await import("./cj.js");

const record = (overrides: Record<string, unknown> = {}) => ({
  order: {
    id: 73,
    status: "paid",
    verifiedPaymentMode: "live",
    verifiedPaymentAt: new Date(),
    cjOrderNumber: "OKV-73",
    cjSubmissionStatus: null,
    cjOrderId: null,
    cjOrderCode: null,
    cjOrderStatus: null,
    trackingNumber: null,
    trackingStatus: null,
    trackingProvider: null,
    trackingUrl: null,
    customerName: "Test Buyer",
    customerEmail: "buyer@example.com",
    customerPhone: "+2348000000000",
    deliveryCountry: "Nigeria",
    deliveryCountryCode: "NG",
    deliveryAddress: "1 Example Street",
    deliveryAddress2: null,
    deliveryCity: "Lagos",
    deliveryRegion: "Lagos",
    deliveryPostalCode: "100001",
    ...((overrides.order as Record<string, unknown> | undefined) ?? {}),
  },
  items: [{
    id: 8,
    productId: 41,
    quantity: 2,
    variant: null,
    mapping: { cjProductId: "product-1", cjVariantId: "variant-1", cjVariantSku: "CJ-LAMP-BLK", isFixedVariant: true },
  }],
});

function enableAutoOrder() {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("CJ_AUTO_ORDER_ENABLED", "true");
  vi.stubEnv("CJ_SYNC_ENABLED", "true");
  vi.stubEnv("CJ_API_KEY", "fixture-cj-key");
  vi.stubEnv("CJ_FROM_COUNTRY_CODE", "CN");
  vi.stubEnv("CJ_LOGISTIC_NAME", "CJPacket Ordinary");
}

beforeEach(() => {
  Object.values(dbMocks).forEach((mock) => mock.mockReset());
  Object.values(cjMocks).forEach((mock) => mock.mockReset());
  dbMocks.getCjSupplierOrder.mockResolvedValue(record());
  dbMocks.claimCjSupplierOrder.mockResolvedValue({ cjOrderNumber: "OKV-73" });
  dbMocks.claimCjSupplierOrderRetry.mockResolvedValue({ cjOrderNumber: "OKV-73" });
  dbMocks.saveCjSupplierOrderResult.mockResolvedValue(true);
  dbMocks.saveCjOrderReconciliation.mockResolvedValue(true);
  dbMocks.saveCjTracking.mockResolvedValue(true);
  dbMocks.setCjSupplierOrderState.mockResolvedValue(true);
  cjMocks.createSupplierOrder.mockResolvedValue({ orderId: "cj-order-73", orderCode: "CJ-73", orderStatus: "CREATED" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CJ verified-payment fulfillment state machine", () => {
  it("does not claim or contact CJ for a test-mode payment", async () => {
    enableAutoOrder();
    dbMocks.getCjSupplierOrder.mockResolvedValue(record({ order: { verifiedPaymentMode: "test" } }));

    await submitCjOrderForVerifiedPayment(73);

    expect(dbMocks.claimCjSupplierOrder).not.toHaveBeenCalled();
    expect(cjMocks.createSupplierOrder).not.toHaveBeenCalled();
  });

  it("submits an eligible live-verified order once, using an unpaid supplier payload and stable reference", async () => {
    enableAutoOrder();

    await submitCjOrderForVerifiedPayment(73);

    expect(dbMocks.claimCjSupplierOrder).toHaveBeenCalledWith(73);
    expect(cjMocks.createSupplierOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderNumber: "OKV-73",
      fromCountryCode: "CN",
      logisticName: "CJPacket Ordinary",
      shipping: expect.objectContaining({ countryCode: "NG", city: "Lagos", address: "1 Example Street" }),
      items: [{ productId: "product-1", variantId: "variant-1", variantSku: "CJ-LAMP-BLK", quantity: 2, storeLineItemId: "OKV-73-I8" }],
    }));
    expect(dbMocks.saveCjSupplierOrderResult).toHaveBeenCalledWith(73, { orderId: "cj-order-73", orderCode: "CJ-73", orderStatus: "CREATED" });
  });

  it("does not create a duplicate when the database claim is already handled", async () => {
    enableAutoOrder();
    dbMocks.claimCjSupplierOrder.mockResolvedValue(null);

    await submitCjOrderForVerifiedPayment(73);

    expect(cjMocks.createSupplierOrder).not.toHaveBeenCalled();
  });

  it("requires reconciliation if CJ created the order but local persistence fails", async () => {
    enableAutoOrder();
    dbMocks.saveCjSupplierOrderResult.mockRejectedValue(new Error("database write failed"));

    await submitCjOrderForVerifiedPayment(73);

    expect(cjMocks.createSupplierOrder).toHaveBeenCalledOnce();
    expect(dbMocks.setCjSupplierOrderState).toHaveBeenCalledWith(73, "needs_reconciliation", "CJ returned an order, but the local order could not be updated. Reconcile by the stable order reference before any retry.");
    expect(dbMocks.claimCjSupplierOrderRetry).not.toHaveBeenCalled();
  });

  it("marks a transport-ambiguous supplier submit for reconciliation and never auto-retries it", async () => {
    enableAutoOrder();
    cjMocks.createSupplierOrder.mockRejectedValue(new CjOrderSubmissionUncertainError("CJ create response was unavailable."));

    await submitCjOrderForVerifiedPayment(73);

    expect(dbMocks.setCjSupplierOrderState).toHaveBeenCalledWith(73, "needs_reconciliation", "CJ submission could not be confirmed. Reconcile the order before retrying.");
    expect(dbMocks.claimCjSupplierOrderRetry).not.toHaveBeenCalled();
    dbMocks.getCjSupplierOrder.mockResolvedValue(record({ order: { cjSubmissionStatus: "needs_reconciliation" } }));
    await expect(retryCjSupplierOrder(73, true)).resolves.toMatchObject({ outcome: "reconciliation-only" });
    expect(cjMocks.createSupplierOrder).toHaveBeenCalledTimes(1);
  });

  it("reconciles only a supplier response that contains an identifier for this local order", async () => {
    enableAutoOrder();
    dbMocks.getCjSupplierOrder.mockResolvedValue(record({ order: { cjSubmissionStatus: "needs_reconciliation" } }));
    cjMocks.getOrderDetail.mockResolvedValue({ orderId: "cj-order-73", platformOrderId: "OKV-73", cjOrderCode: "CJ-73", orderStatus: "CREATED" });

    await expect(reconcileCjSupplierOrder(73)).resolves.toEqual({ outcome: "reconciled" });
    expect(dbMocks.saveCjOrderReconciliation).toHaveBeenCalledWith(73, { orderId: "cj-order-73", orderCode: "CJ-73", orderStatus: "CREATED" });

    cjMocks.getOrderDetail.mockResolvedValue({ orderId: "unrelated-cj-order", platformOrderId: "OTHER-ORDER", orderStatus: "CREATED" });
    await expect(reconcileCjSupplierOrder(73)).resolves.toEqual({ outcome: "mismatch" });
    expect(dbMocks.saveCjOrderReconciliation).toHaveBeenCalledTimes(1);
  });

  it("fails closed when CJ cannot be queried during retry reconciliation", async () => {
    enableAutoOrder();
    dbMocks.getCjSupplierOrder.mockResolvedValue(record({ order: { cjSubmissionStatus: "blocked" } }));
    cjMocks.getOrderDetail.mockRejectedValue(new Error("network error"));

    await expect(retryCjSupplierOrder(73, true)).resolves.toMatchObject({ outcome: "reconciliation-unavailable" });
    expect(dbMocks.claimCjSupplierOrderRetry).not.toHaveBeenCalled();
    expect(cjMocks.createSupplierOrder).not.toHaveBeenCalled();
  });

  it("syncs tracking only for the matching verified CJ order", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CJ_SYNC_ENABLED", "true");
    vi.stubEnv("CJ_API_KEY", "fixture-cj-key");
    dbMocks.getCjSupplierOrder.mockResolvedValue(record({ order: { cjSubmissionStatus: "created_unpaid", cjOrderId: "cj-order-73", cjOrderCode: "CJ-73" } }));
    cjMocks.getOrderDetail.mockResolvedValue({ orderId: "cj-order-73", platformOrderId: "OKV-73", cjOrderCode: "CJ-73", orderStatus: "SHIPPED", trackNumber: "TRACK-73" });
    cjMocks.getTrackingInfo.mockResolvedValue({ trackingNumber: "TRACK-73", trackingStatus: "In transit", lastMileCarrier: "Carrier" });

    await expect(syncCjTrackingForOrder(73)).resolves.toEqual({ trackingNumber: "TRACK-73", trackingStatus: "In transit", orderStatus: "SHIPPED" });
    expect(dbMocks.saveCjTracking).toHaveBeenCalledWith(73, "cj-order-73", expect.objectContaining({ trackingNumber: "TRACK-73", trackingStatus: "In transit", trackingProvider: "Carrier" }));

    cjMocks.getOrderDetail.mockResolvedValue({ orderId: "other-order", platformOrderId: "OTHER-ORDER" });
    await expect(syncCjTrackingForOrder(73)).rejects.toThrow("CJ order details did not match this local order");
    expect(dbMocks.saveCjTracking).toHaveBeenCalledTimes(1);
  });
});
