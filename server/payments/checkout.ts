import type { PaymentIntentLine } from "../../drizzle/schema.js";
import {
  createPaidOrderFromIntent,
  createPaymentIntent,
  getCheckoutProductsBySlug,
  getPaymentIntent,
  updatePaymentIntentStatus,
} from "./repository.js";
import {
  getAllowedPaystackMode,
  initializePaystackTransaction,
  matchesVerifiedPayment,
  verifyPaystackTransaction,
} from "./paystack.js";
import { isSupplierQuantityAvailable } from "../../shared/supplierStock.js";

export type CheckoutItem = {
  slug: string;
  quantity: number;
  variant?: { size?: string; color?: string };
};

export type CheckoutDetails = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryCountry: string;
  deliveryCountryCode: string;
  deliveryAddress: string;
  deliveryAddress2?: string;
  deliveryCity: string;
  deliveryRegion: string;
  deliveryPostalCode?: string;
  coupon?: string;
  items: CheckoutItem[];
};

export type CheckoutTotals = {
  subtotalKobo: number;
  discountKobo: number;
  shippingKobo: number;
  taxKobo: number;
  totalKobo: number;
};

const MAX_MYSQL_INT = 2_147_483_647;

export function calculateCheckoutTotals(subtotalKobo: number, coupon?: string): CheckoutTotals {
  if (!Number.isSafeInteger(subtotalKobo) || subtotalKobo <= 0) throw new Error("The cart total is invalid.");
  const discountKobo = coupon?.trim().toUpperCase() === "OLUCHA10"
    ? Math.round((subtotalKobo / 100) * 0.1) * 100
    : 0;
  const shippingKobo = subtotalKobo >= 10_000_000 ? 0 : 250_000;
  // Prices are VAT-inclusive (like Jumia), so no tax is added at checkout.
  const taxKobo = 0;
  const totalKobo = subtotalKobo - discountKobo + shippingKobo + taxKobo;
  if (!Number.isSafeInteger(totalKobo) || totalKobo <= 0 || totalKobo > MAX_MYSQL_INT) {
    throw new Error("The cart total is outside the supported range.");
  }
  return { subtotalKobo, discountKobo, shippingKobo, taxKobo, totalKobo };
}

function validateOrigin(origin: string): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("The checkout host is not configured.");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.origin !== origin) {
    throw new Error("The checkout host is not configured.");
  }
  return url.origin;
}

export async function initializePaymentCheckout(
  input: CheckoutDetails,
  userId: number,
  requestOrigin: string,
  secretKey: string,
): Promise<{ authorizationUrl: string; reference: string; totalKobo: number; currency: "NGN" }> {
  if (!getAllowedPaystackMode(secretKey)) throw new Error("Online payment is not available right now. Please try again later.");
  if (!Number.isSafeInteger(userId) || userId < 0) throw new Error("Sign in to continue to secure checkout.");
  const origin = validateOrigin(requestOrigin);
  const expectedCountryCodes: Record<string, string> = { Nigeria: "NG", Ghana: "GH", "United Kingdom": "GB", "United States": "US" };
  if (expectedCountryCodes[input.deliveryCountry] !== input.deliveryCountryCode) throw new Error("The delivery country is invalid.");
  if (input.deliveryAddress.trim().length < 8 || input.deliveryCity.trim().length < 2 || input.deliveryRegion.trim().length < 2) {
    throw new Error("Enter a complete delivery address, city, and state or region.");
  }
  if (input.items.length < 1 || input.items.length > 20) throw new Error("Your cart could not be checked. Please review it and try again.");

  const products = await getCheckoutProductsBySlug(input.items.map((item) => item.slug));
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  if (bySlug.size !== new Set(input.items.map((item) => item.slug)).size) {
    throw new Error("One or more products are unavailable. Please refresh your cart.");
  }

  const lines: PaymentIntentLine[] = input.items.map((item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new Error("A cart quantity is invalid.");
    }
    const product = bySlug.get(item.slug);
    if (!product || product.isActive !== 1 || product.priceKobo <= 0 || product.currency.toUpperCase() !== "NGN") {
      throw new Error("One or more products cannot be purchased in this checkout.");
    }
    if (!isSupplierQuantityAvailable({
      mapped: product.supplierMappingId !== null,
      stock: product.supplierStock,
      syncedAt: product.supplierStockSyncedAt,
      quantity: item.quantity,
    })) {
      throw new Error("One or more items are no longer in stock. Please refresh your cart.");
    }
    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPriceKobo: product.priceKobo,
      variant: item.variant ? {
        ...(item.variant.size ? { size: item.variant.size.trim().slice(0, 80) } : {}),
        ...(item.variant.color ? { color: item.variant.color.trim().slice(0, 80) } : {}),
      } : null,
    };
  });
  const subtotalKobo = lines.reduce((total, line) => total + line.unitPriceKobo * line.quantity, 0);
  const totals = calculateCheckoutTotals(subtotalKobo, input.coupon);
  const reference = `okv-${crypto.randomUUID().replaceAll("-", "")}`;
  const callbackUrl = `${origin}/api/payments/paystack/callback`;
  const cancelActionUrl = `${origin}/api/payments/paystack/cancel?reference=${encodeURIComponent(reference)}`;

  await createPaymentIntent({
    reference,
    userId,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim().toLowerCase(),
    customerPhone: input.customerPhone.trim(),
    deliveryCountry: input.deliveryCountry.trim(),
    deliveryCountryCode: input.deliveryCountryCode,
    deliveryAddress: input.deliveryAddress.trim(),
    deliveryAddress2: input.deliveryAddress2?.trim() || null,
    deliveryCity: input.deliveryCity.trim(),
    deliveryRegion: input.deliveryRegion.trim(),
    deliveryPostalCode: input.deliveryPostalCode?.trim() || null,
    totalKobo: totals.totalKobo,
    currency: "NGN",
    lines,
  });

  try {
    const initialized = await initializePaystackTransaction(secretKey, {
      email: input.customerEmail.trim().toLowerCase(),
      amountKobo: totals.totalKobo,
      currency: "NGN",
      reference,
      callbackUrl,
      cancelActionUrl,
    });
    await updatePaymentIntentStatus(reference, "pending");
    return { ...initialized, totalKobo: totals.totalKobo, currency: "NGN" };
  } catch {
    await updatePaymentIntentStatus(reference, "failed").catch(() => undefined);
    throw new Error("Payment could not be started. No order was created; please try again.");
  }
}

export type CompletePaymentResult =
  | { outcome: "success"; orderId: number }
  | { outcome: "failed" | "pending" | "unknown" };

type PaymentCompleterDependencies = {
  getIntent: (reference: string) => Promise<{ reference: string; totalKobo: number; currency: string } | null>;
  verifyTransaction: typeof verifyPaystackTransaction;
  updateIntentStatus: typeof updatePaymentIntentStatus;
  createPaidOrder: (reference: string, mode: "test" | "live") => ReturnType<typeof createPaidOrderFromIntent>;
  onVerifiedLivePayment?: (orderId: number) => Promise<void>;
};

export function createPaystackPaymentCompleter(dependencies: PaymentCompleterDependencies) {
  return async function complete(reference: string, secretKey: string): Promise<CompletePaymentResult> {
    const mode = getAllowedPaystackMode(secretKey);
    if (!mode) throw new Error("Online payment is not available right now. Please try again later.");
    const intent = await dependencies.getIntent(reference);
    if (!intent) return { outcome: "unknown" };

    const transaction = await dependencies.verifyTransaction(secretKey, reference);
    if (transaction.status !== "success") {
      if (["pending", "ongoing"].includes(transaction.status)) return { outcome: "pending" };
      await dependencies.updateIntentStatus(reference, "failed");
      return { outcome: "failed" };
    }
    if (!matchesVerifiedPayment(transaction, {
      reference: intent.reference,
      amountKobo: intent.totalKobo,
      currency: intent.currency,
      mode,
    })) {
      await dependencies.updateIntentStatus(reference, "failed");
      return { outcome: "failed" };
    }

    const order = await dependencies.createPaidOrder(reference, mode);
    if (order && mode === "live" && dependencies.onVerifiedLivePayment) {
      await dependencies.onVerifiedLivePayment(order.orderId).catch(() => undefined);
    }
    return order ? { outcome: "success", orderId: order.orderId } : { outcome: "unknown" };
  };
}

export const completePaystackPayment = createPaystackPaymentCompleter({
  getIntent: getPaymentIntent,
  verifyTransaction: verifyPaystackTransaction,
  updateIntentStatus: updatePaymentIntentStatus,
  createPaidOrder: createPaidOrderFromIntent,
  onVerifiedLivePayment: async (orderId) => {
    const { submitCjOrderForVerifiedPayment } = await import("../suppliers/cjFulfillment.js");
    await submitCjOrderForVerifiedPayment(orderId);
  },
});

export async function markPaymentCancelled(reference: string): Promise<void> {
  await updatePaymentIntentStatus(reference, "cancelled");
}
