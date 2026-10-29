import { ENV } from "../_core/env.js";
import {
  claimCjSupplierOrder,
  claimCjSupplierOrderRetry,
  getCjSupplierOrder,
  saveCjOrderReconciliation,
  saveCjSupplierOrderResult,
  saveCjTracking,
  setCjSupplierOrderState,
} from "../db.js";
import {
  createCjClient,
  CjOrderPreflightError,
  CjOrderSubmissionUncertainError,
  type CjCreatedOrder,
  type CjOrderDetail,
  type CjSupplierOrderInput,
} from "./cj.js";

type CjClient = ReturnType<typeof createCjClient>;
let cachedClient: CjClient | null = null;
let cachedApiKey = "";

export function isCjAutoOrderAvailable(): boolean {
  return ENV.cjAutoOrderEnabled && ENV.vercelEnv !== "preview" && Boolean(ENV.cjSyncEnabled && ENV.cjApiKey && ENV.cjFromCountryCode && ENV.cjLogisticName);
}

function requireCjAutoOrderClient(): CjClient {
  if (!isCjAutoOrderAvailable()) throw new Error("CJ auto-order is disabled or missing explicit shipping configuration.");
  if (!cachedClient || cachedApiKey !== ENV.cjApiKey) {
    cachedApiKey = ENV.cjApiKey;
    cachedClient = createCjClient(cachedApiKey);
  }
  return cachedClient;
}

function isLiveVerifiedPaidOrder(order: NonNullable<Awaited<ReturnType<typeof getCjSupplierOrder>>>["order"]): boolean {
  return order.status === "paid" && order.verifiedPaymentMode === "live" && Boolean(order.verifiedPaymentAt);
}

function supplierInputForOrder(
  record: NonNullable<Awaited<ReturnType<typeof getCjSupplierOrder>>>,
): CjSupplierOrderInput {
  const { order, items } = record;
  if (!order.cjOrderNumber) throw new Error("A stable CJ order reference is missing.");
  if (!order.customerName || !order.customerEmail || !order.customerPhone || !order.deliveryCountry || !order.deliveryCountryCode || !order.deliveryAddress || !order.deliveryCity || !order.deliveryRegion) {
    throw new Error("The order is missing required customer delivery details.");
  }
  if (!items.length || items.length > 20) throw new Error("The local order has no valid supplier-order lines.");
  const mappedItems = items.map((item) => {
    const mapping = item.mapping;
    if (!mapping) throw new Error("Every item must have a CJ mapping before automatic supplier submission.");
    if (!mapping.cjVariantSku) throw new Error("A mapped CJ variant SKU is missing; refresh the mapping before submission.");
    const selectedVariant = item.variant && typeof item.variant === "object" ? item.variant as Record<string, unknown> : {};
    const hasCustomerSelectedVariant = [selectedVariant.size, selectedVariant.color].some((value) => typeof value === "string" && value.trim().length > 0);
    if (hasCustomerSelectedVariant && mapping.isFixedVariant !== true) {
      throw new Error("This order contains a customer-selected variant that is not bound to the saved CJ variant.");
    }
    return {
      productId: mapping.cjProductId,
      variantId: mapping.cjVariantId,
      variantSku: mapping.cjVariantSku,
      quantity: item.quantity,
      storeLineItemId: `OKV-${order.id}-I${item.id}`,
    };
  });
  return {
    orderNumber: order.cjOrderNumber,
    shipping: {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      country: order.deliveryCountry,
      countryCode: order.deliveryCountryCode,
      address: order.deliveryAddress,
      address2: order.deliveryAddress2,
      city: order.deliveryCity,
      region: order.deliveryRegion,
      postalCode: order.deliveryPostalCode,
    },
    fromCountryCode: ENV.cjFromCountryCode,
    logisticName: ENV.cjLogisticName,
    items: mappedItems,
  };
}

function resultFromDetail(detail: CjOrderDetail): CjCreatedOrder | null {
  const orderId = detail.orderId ?? detail.cjOrderId;
  if (!orderId) return null;
  return {
    orderId,
    orderCode: detail.cjOrderCode ?? detail.orderNum,
    orderStatus: detail.orderStatus,
  };
}

function detailMatchesLocalOrder(
  detail: CjOrderDetail,
  localOrder: NonNullable<Awaited<ReturnType<typeof getCjSupplierOrder>>>["order"],
): boolean {
  const returned = [detail.orderId, detail.cjOrderId, detail.orderNum, detail.cjOrderCode, detail.platformOrderId].filter((value): value is string => Boolean(value));
  const expected = [localOrder.cjOrderId, localOrder.cjOrderCode, localOrder.cjOrderNumber].filter((value): value is string => Boolean(value));
  return expected.some((value) => returned.includes(value));
}

async function attemptSupplierCreate(orderId: number, isRetry: boolean): Promise<{ outcome: string; message?: string }> {
  const record = await getCjSupplierOrder(orderId);
  if (!record || !isLiveVerifiedPaidOrder(record.order)) return { outcome: "ineligible" };
  const claimed = isRetry ? await claimCjSupplierOrderRetry(orderId) : await claimCjSupplierOrder(orderId);
  if (!claimed) return { outcome: "already-handled" };
  let result: CjCreatedOrder;
  try {
    const input = supplierInputForOrder({
      ...record,
      order: { ...record.order, cjOrderNumber: claimed.cjOrderNumber ?? `OKV-${orderId}` },
    });
    const client = requireCjAutoOrderClient();
    result = await client.createSupplierOrder(input);
  } catch (error) {
    if (error instanceof CjOrderSubmissionUncertainError) {
      await setCjSupplierOrderState(orderId, "needs_reconciliation", error.message);
      return { outcome: "needs_reconciliation", message: error.message };
    }
    const message = error instanceof CjOrderPreflightError || error instanceof Error
      ? error.message.slice(0, 1000)
      : "CJ order preparation failed; no supplier order was submitted.";
    await setCjSupplierOrderState(orderId, "blocked", message);
    return { outcome: "blocked", message };
  }

  try {
    const saved = await saveCjSupplierOrderResult(orderId, result);
    if (saved) return { outcome: "created_unpaid" };
  } catch {
    // CJ has confirmed order creation; any local persistence error is ambiguous and must never enable another create attempt.
  }
  const message = "CJ returned an order, but the local order could not be updated. Reconcile by the stable order reference before any retry.";
  await setCjSupplierOrderState(orderId, "needs_reconciliation", message);
  return { outcome: "needs_reconciliation", message };
}

/** Called only after Paystack has authoritatively verified a live-domain payment. */
export async function submitCjOrderForVerifiedPayment(orderId: number): Promise<void> {
  if (!isCjAutoOrderAvailable()) return;
  const record = await getCjSupplierOrder(orderId);
  if (!record || !isLiveVerifiedPaidOrder(record.order)) return;
  await attemptSupplierCreate(orderId, false);
}

/** Read-only deterministic lookup; a returned CJ record is saved only if its identifiers match this local order. */
export async function reconcileCjSupplierOrder(orderId: number): Promise<{ outcome: "reconciled" | "not-found" | "unavailable" | "ineligible" | "mismatch" }> {
  const record = await getCjSupplierOrder(orderId);
  if (!record || !isLiveVerifiedPaidOrder(record.order) || !record.order.cjOrderNumber || !record.order.cjSubmissionStatus) return { outcome: "ineligible" };
  if (record.order.cjSubmissionStatus === "created_unpaid" && record.order.cjOrderId) return { outcome: "reconciled" };
  let detail: CjOrderDetail;
  try {
    detail = await requireCjAutoOrderClient().getOrderDetail(record.order.cjOrderNumber);
  } catch {
    return { outcome: "unavailable" };
  }
  if (!detailMatchesLocalOrder(detail, record.order)) {
    const hasIdentifiers = [detail.orderId, detail.cjOrderId, detail.orderNum, detail.cjOrderCode, detail.platformOrderId].some(Boolean);
    return hasIdentifiers ? { outcome: "mismatch" } : { outcome: "not-found" };
  }
  const result = resultFromDetail(detail);
  if (!result) return { outcome: "unavailable" };
  const saved = await saveCjOrderReconciliation(orderId, result);
  return saved ? { outcome: "reconciled" } : { outcome: "unavailable" };
}

/** Human-confirmed retry: first reconcile, then submit only if the operator explicitly confirmed CJ has no matching order. */
export async function retryCjSupplierOrder(orderId: number, confirmedNoMatchingOrder: boolean): Promise<{ outcome: string; message?: string }> {
  if (!isCjAutoOrderAvailable()) return { outcome: "disabled" };
  if (!confirmedNoMatchingOrder) return { outcome: "confirmation-required" };
  const record = await getCjSupplierOrder(orderId);
  if (!record || record.order.cjSubmissionStatus !== "blocked") {
    return { outcome: "reconciliation-only", message: "An ambiguous supplier submission cannot be retried automatically. Reconcile the existing CJ order instead." };
  }
  const reconciliation = await reconcileCjSupplierOrder(orderId);
  if (reconciliation.outcome === "reconciled") return { outcome: "reconciled" };
  if (reconciliation.outcome === "mismatch") return { outcome: "mismatch", message: "CJ returned an order record that does not match this local order. No retry was submitted." };
  if (reconciliation.outcome === "ineligible") return { outcome: "ineligible" };
  if (reconciliation.outcome === "unavailable") return { outcome: "reconciliation-unavailable", message: "CJ could not confirm the order reference. No retry was submitted." };
  if (reconciliation.outcome !== "not-found") return { outcome: "reconciliation-only" };
  return attemptSupplierCreate(orderId, true);
}

/** Read CJ tracking, verify the returned supplier order identity, then update only this exact local order row. */
export async function syncCjTrackingForOrder(orderId: number): Promise<{ trackingNumber: string | null; trackingStatus: string | null; orderStatus: string | null }> {
  if (ENV.vercelEnv !== "preview" || !ENV.cjSyncEnabled || !ENV.cjApiKey) throw new Error("CJ tracking sync is not configured for this Preview deployment.");
  const record = await getCjSupplierOrder(orderId);
  if (!record || !isLiveVerifiedPaidOrder(record.order) || record.order.cjSubmissionStatus !== "created_unpaid" || !record.order.cjOrderId) {
    throw new Error("This order has no verified, matching CJ supplier order to track.");
  }
  const client = createCjClient(ENV.cjApiKey);
  const detail = await client.getOrderDetail(record.order.cjOrderId);
  if (!detailMatchesLocalOrder(detail, record.order)) throw new Error("CJ order details did not match this local order; no tracking data was saved.");
  const currentTrackNumber = detail.trackNumber ?? record.order.trackingNumber;
  const tracking = currentTrackNumber ? await client.getTrackingInfo(currentTrackNumber) : null;
  const trackingNumber = tracking?.trackingNumber ?? currentTrackNumber ?? null;
  const saved = await saveCjTracking(orderId, record.order.cjOrderId, {
    cjOrderCode: detail.cjOrderCode ?? record.order.cjOrderCode,
    cjOrderStatus: detail.orderStatus ?? record.order.cjOrderStatus,
    trackingNumber,
    trackingStatus: tracking?.trackingStatus ?? record.order.trackingStatus,
    trackingProvider: tracking?.lastMileCarrier ?? detail.trackingProvider ?? record.order.trackingProvider,
    trackingUrl: detail.trackingUrl ?? record.order.trackingUrl,
    trackingSyncedAt: new Date(),
  });
  if (!saved) throw new Error("The CJ order mapping changed while tracking was being refreshed; no data was saved.");
  return { trackingNumber, trackingStatus: tracking?.trackingStatus ?? record.order.trackingStatus, orderStatus: detail.orderStatus ?? record.order.cjOrderStatus };
}
