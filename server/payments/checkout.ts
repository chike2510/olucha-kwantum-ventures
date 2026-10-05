import type { PaymentIntentLine } from "../../drizzle/schema.js";
import {
  createPaidOrderFromIntent,
  createPaymentIntent,
  getCheckoutProductsBySlug,
  getPaymentIntent,
  updatePaymentIntentStatus,
} from "./repository.js";
import {
  initializePaystackTransaction,
  matchesVerifiedPayment,
  verifyPaystackTransaction,
} from "./paystack.js";

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
  deliveryAddress: string;
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
  const taxKobo = Math.round(((subtotalKobo - discountKobo) / 100) * 0.075) * 100;
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
  if (!secretKey.startsWith("sk_test_")) throw new Error("Paystack test mode is not configured.");
  if (!Number.isSafeInteger(userId) || userId < 0) throw new Error("Sign in to continue to secure checkout.");
  const origin = validateOrigin(requestOrigin);
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
    deliveryAddress: input.deliveryAddress.trim(),
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
  createPaidOrder: typeof createPaidOrderFromIntent;
};

export function createPaystackPaymentCompleter(dependencies: PaymentCompleterDependencies) {
  return async function complete(reference: string, secretKey: string): Promise<CompletePaymentResult> {
    if (!secretKey.startsWith("sk_test_")) throw new Error("Paystack test mode is not configured.");
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
    })) {
      await dependencies.updateIntentStatus(reference, "failed");
      return { outcome: "failed" };
    }

    const order = await dependencies.createPaidOrder(reference);
    return order ? { outcome: "success", orderId: order.orderId } : { outcome: "unknown" };
  };
}

export const completePaystackPayment = createPaystackPaymentCompleter({
  getIntent: getPaymentIntent,
  verifyTransaction: verifyPaystackTransaction,
  updateIntentStatus: updatePaymentIntentStatus,
  createPaidOrder: createPaidOrderFromIntent,
});

export async function markPaymentCancelled(reference: string): Promise<void> {
  await updatePaymentIntentStatus(reference, "cancelled");
}
