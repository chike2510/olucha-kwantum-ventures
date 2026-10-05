import { and, eq, inArray, ne } from "drizzle-orm";
import { notifyOwner } from "../_core/notification.js";
import { getDb } from "../db.js";
import { orders, orderItems, paymentIntents, products, type PaymentIntentLine } from "../../drizzle/schema.js";

export type CheckoutProduct = {
  id: number;
  slug: string;
  name: string;
  priceKobo: number;
  currency: string;
  isActive: number;
};

export type NewPaymentIntent = {
  reference: string;
  userId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryCountry: string;
  deliveryAddress: string;
  totalKobo: number;
  currency: string;
  lines: PaymentIntentLine[];
};

function toInsertedId(result: { lastInsertId: string | null }): number {
  const id = Number(result.lastInsertId);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Database did not return a valid inserted row ID.");
  return id;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; errno?: unknown; message?: unknown };
  return (
    candidate.code === "ER_DUP_ENTRY" ||
    candidate.code === "1062" ||
    candidate.errno === 1062 ||
    (typeof candidate.message === "string" && candidate.message.includes("Duplicate entry"))
  );
}

export async function getCheckoutProductsBySlug(slugs: string[]): Promise<CheckoutProduct[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  if (slugs.length === 0) return [];
  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceKobo: products.priceKobo,
      currency: products.currency,
      isActive: products.isActive,
    })
    .from(products)
    .where(and(inArray(products.slug, Array.from(new Set(slugs))), eq(products.isActive, 1)));
}

export async function createPaymentIntent(input: NewPaymentIntent): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  await db.insert(paymentIntents).values({ ...input, status: "initializing" });
}

export async function getPaymentIntent(reference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  const rows = await db.select().from(paymentIntents).where(eq(paymentIntents.reference, reference)).limit(1);
  return rows[0] ?? null;
}

export async function updatePaymentIntentStatus(
  reference: string,
  status: "pending" | "failed" | "cancelled" | "paid",
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  await db
    .update(paymentIntents)
    .set({ status })
    .where(and(eq(paymentIntents.reference, reference), ne(paymentIntents.status, "paid")));
}

export async function createPaidOrderFromIntent(reference: string): Promise<{ orderId: number; created: boolean } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");

  try {
    const result = await db.transaction(async (tx) => {
      const intents = await tx
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.reference, reference))
        .limit(1);
      const intent = intents[0];
      if (!intent) return null;

      const existing = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.paystackReference, reference))
        .limit(1);
      if (existing[0]) {
        await tx
          .update(paymentIntents)
          .set({ status: "paid" })
          .where(eq(paymentIntents.reference, reference));
        return { orderId: existing[0].id, created: false };
      }

      const inserted = await tx.insert(orders).values({
        userId: intent.userId,
        customerName: intent.customerName,
        customerEmail: intent.customerEmail,
        customerPhone: intent.customerPhone,
        deliveryCountry: intent.deliveryCountry,
        deliveryAddress: intent.deliveryAddress,
        totalKobo: intent.totalKobo,
        currency: intent.currency,
        status: "paid",
        paystackReference: reference,
      });
      const orderId = toInsertedId(inserted);
      const lines = intent.lines as PaymentIntentLine[];
      if (!Array.isArray(lines) || lines.length === 0) throw new Error("Payment intent has no order lines.");
      await tx.insert(orderItems).values(lines.map((line) => ({
        orderId,
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceKobo: line.unitPriceKobo,
        variant: line.variant ?? null,
      })));
      await tx
        .update(paymentIntents)
        .set({ status: "paid" })
        .where(eq(paymentIntents.reference, reference));
      return { orderId, created: true };
    });

    if (result?.created) {
      const intent = await getPaymentIntent(reference);
      if (intent) {
        await notifyOwner({
          title: `New paid order #${result.orderId}`,
          content: `${intent.customerName} placed an order for ${(intent.totalKobo / 100).toLocaleString()} ${intent.currency}. Email: ${intent.customerEmail}. Items: ${(intent.lines as PaymentIntentLine[]).map((line) => `${line.productName} × ${line.quantity}`).join(", ")}.`,
        }).catch(() => undefined);
      }
    }
    return result;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.paystackReference, reference))
      .limit(1);
    if (!existing[0]) throw error;
    return { orderId: existing[0].id, created: false };
  }
}
