import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser,
  users,
  products,
  exportInquiries,
  contactMessages,
  blogPosts,
  orders,
  orderItems,
  cjProductLinks,
  Product,
  InsertProduct,
} from "../drizzle/schema.js";
import { SUPABASE_ROOT_CA } from "./db-ca.js";
import { ENV } from "./_core/env.js";
import { notifyOwner } from "./_core/notification.js";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  // On Cloudflare Workers, TLS to Supabase's pooler is not possible directly; Hyperdrive
  // holds the encrypted origin connection. Worker I/O objects cannot be shared across
  // requests, so build a fresh lightweight pool per call (Hyperdrive does the pooling).
  const hyperdrive = ENV.hyperdriveConnectionString;
  if (hyperdrive) {
    const pool = new Pool({ connectionString: hyperdrive, max: 1, idleTimeoutMillis: 1_000, allowExitOnIdle: true });
    pool.on("error", (error) => console.warn("[Database] Hyperdrive connection error:", error));
    return drizzle(pool);
  }
  if (ENV.isWorkerRuntime) {
    console.warn("[Database] Worker Hyperdrive binding is unavailable.");
    return null;
  }

  const databaseUrl = ENV.databaseUrl;
  if (!_db && databaseUrl) {
    try {
      const parsedUrl = new URL(databaseUrl);
      if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
        throw new Error("DATABASE_URL must use postgres:// or postgresql://");
      }
      if (parsedUrl.password) {
        throw new Error("Store the PostgreSQL password separately in DATABASE_PASSWORD.");
      }
      if (parsedUrl.search) {
        throw new Error("DATABASE_URL query parameters are not supported; TLS uses the Supabase CA.");
      }
      const databasePassword = ENV.databasePassword;
      if (!databasePassword) {
        throw new Error("DATABASE_PASSWORD must be configured separately from DATABASE_URL.");
      }
      const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
      if (!parsedUrl.hostname || !parsedUrl.username || !databaseName) {
        throw new Error("DATABASE_URL must include host, username, and database.");
      }
      _pool = new Pool({
        host: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
        user: decodeURIComponent(parsedUrl.username),
        database: databaseName,
        password: databasePassword,
        ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
        max: 1,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 10_000,
        allowExitOnIdle: true,
      });
      _pool.on("error", (error) => console.warn("[Database] Idle PostgreSQL connection error:", error));
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to initialize:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Partial<InsertUser> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listProducts(search?: string, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const filters: SQL[] = [eq(products.isActive, 1)];
  if (category && category !== "All products") filters.push(eq(products.category, category));
  if (search) filters.push(or(
    ilike(products.name, `%${search}%`),
    ilike(products.category, `%${search}%`),
    ilike(products.description, `%${search}%`),
  )!);
  const rows = await db
    .select({ product: products, link: cjProductLinks })
    .from(products)
    .leftJoin(cjProductLinks, eq(cjProductLinks.productId, products.id))
    .where(and(...filters)!)
    .orderBy(desc(products.createdAt))
    .limit(100);
  return rows.map(({ product, link }) => ({
    ...product,
    supplierMapped: Boolean(link),
    supplierVariantFixed: link?.isFixedVariant === true,
    supplierStock: link?.stockQuantity ?? null,
    supplierStockSyncedAt: link?.stockSyncedAt ?? null,
  }));
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ product: products, link: cjProductLinks })
    .from(products)
    .leftJoin(cjProductLinks, eq(cjProductLinks.productId, products.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, 1))!)
    .limit(1);
  const row = result[0];
  return row ? {
    ...row.product,
    supplierMapped: Boolean(row.link),
    supplierVariantFixed: row.link?.isFixedVariant === true,
    supplierStock: row.link?.stockQuantity ?? null,
    supplierStockSyncedAt: row.link?.stockSyncedAt ?? null,
  } : null;
}

export async function createProduct(input: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(products).values(input);
  return { success: true };
}

export async function importCjProductDraft(input: {
  name: string;
  slug: string;
  category: string;
  description: string;
  specifications: Record<string, string>;
  priceKobo: number;
  currency: string;
  unit: string;
  imageUrl: string | null;
  cjProductId: string;
  cjVariantId: string;
  cjProductName: string;
  cjVariantName: string;
  cjProductSku: string | null;
  cjVariantSku: string | null;
  cjImageUrl: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: cjProductLinks.id }).from(cjProductLinks)
      .where(eq(cjProductLinks.cjVariantId, input.cjVariantId)).limit(1).for("update");
    if (existing) throw new Error("This CJ variant has already been imported or mapped.");
    const [product] = await tx.insert(products).values({
      name: input.name,
      slug: input.slug,
      category: input.category,
      description: input.description,
      specifications: input.specifications,
      priceKobo: input.priceKobo,
      currency: input.currency,
      unit: input.unit,
      imageUrl: input.imageUrl,
      adminCreatedAt: new Date(),
      isActive: 0,
    }).returning({ id: products.id });
    if (!product) throw new Error("CJ product draft could not be created.");
    const [link] = await tx.insert(cjProductLinks).values({
      productId: product.id,
      cjProductId: input.cjProductId,
      cjVariantId: input.cjVariantId,
      cjProductName: input.cjProductName,
      cjVariantName: input.cjVariantName,
      cjProductSku: input.cjProductSku,
      cjVariantSku: input.cjVariantSku,
      cjImageUrl: input.cjImageUrl,
      cjImportedAt: new Date(),
      isFixedVariant: true,
      stockQuantity: null,
      stockSyncedAt: null,
    }).returning();
    if (!link) throw new Error("CJ product draft mapping could not be saved.");
    return { productId: product.id, isActive: 0, cjLink: link };
  });
}

export async function updateProduct(id: number, input: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(products).set(input).where(eq(products.id, id));
  return { success: true };
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: products.id, adminCreatedAt: products.adminCreatedAt }).from(products).where(eq(products.id, id)).for("update");
    if (!product) return { found: false, deletable: false, deleted: false, archived: false, orderItemCount: 0 };
    if (!product.adminCreatedAt) return { found: true, deletable: false, deleted: false, archived: false, orderItemCount: 0 };

    const [history] = await tx.select({ count: sql<number>`count(*)::int` }).from(orderItems).where(eq(orderItems.productId, id));
    const orderItemCount = Number(history?.count ?? 0);
    if (orderItemCount > 0) {
      await tx.update(products).set({ isActive: 0, updatedAt: new Date() }).where(eq(products.id, id));
      return { found: true, deletable: true, deleted: false, archived: true, orderItemCount };
    }

    const [deleted] = await tx.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    if (!deleted) throw new Error("The product could not be removed.");
    return { found: true, deletable: true, deleted: true, archived: false, orderItemCount: 0 };
  });
}

export async function createExportInquiry(input: typeof exportInquiries.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [created] = await db.insert(exportInquiries).values(input).returning({ id: exportInquiries.id });
  await notifyOwner({ title: "New export inquiry", content: `${input.fullName} requested ${input.productInterest} for ${input.destinationCountry}. Contact: ${input.email}. Quantity: ${input.quantity || "Not specified"}.` }).catch((error) => console.warn("[Notification] Export inquiry alert failed:", error));
  if (!created) throw new Error("Database did not return the export inquiry ID");
  return { id: created.id };
}

export async function createContactMessage(input: typeof contactMessages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [created] = await db.insert(contactMessages).values(input).returning({ id: contactMessages.id });
  if (!created) throw new Error("Database did not return the contact message ID");
  return { id: created.id };
}

export async function listExportInquiries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exportInquiries).orderBy(desc(exportInquiries.createdAt));
}

export async function updateExportInquiryStatus(id: number, status: "new" | "reviewing" | "quoted" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(exportInquiries).set({ status }).where(eq(exportInquiries.id, id));
  return { success: true };
}

export async function listAllProducts() {
  const db = await getDb();
  if (!db) return [];
  // Admin reads must reflect completed edits/deletions. PostgreSQL's STABLE
  // CURRENT_TIMESTAMP makes this query non-cacheable by Hyperdrive; the read
  // marker stays internal and the approved binding/configuration is unchanged.
  const rows = await db.select({ product: products, cjLink: cjProductLinks, readAt: sql<Date>`current_timestamp` }).from(products).leftJoin(cjProductLinks, eq(cjProductLinks.productId, products.id)).orderBy(desc(products.createdAt)).limit(200);
  return rows.map(({ product, cjLink }) => ({ ...product, cjLink }));
}

export async function getCjProductLinkByProductId(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(cjProductLinks).where(eq(cjProductLinks.productId, productId)).limit(1);
  return result[0] ?? null;
}

export async function getAdminProductWithCjLink(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.select({ product: products, cjLink: cjProductLinks }).from(products)
    .leftJoin(cjProductLinks, eq(cjProductLinks.productId, products.id))
    .where(eq(products.id, productId)).limit(1);
  return result ?? null;
}

export async function saveCjProductMapping(productId: number, cjProductId: string, cjVariantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [link] = await db.insert(cjProductLinks).values({ productId, cjProductId, cjVariantId }).onConflictDoUpdate({
    target: cjProductLinks.productId,
    set: { cjProductId, cjVariantId, cjProductSku: null, cjVariantSku: null, cjProductName: null, cjVariantName: null, cjImageUrl: null, stockQuantity: null, stockSyncedAt: null },
  }).returning();
  if (!link) throw new Error("CJ product mapping could not be saved");
  return link;
}

export async function updateCjProductSync(productId: number, cjProductId: string, cjVariantId: string, sync: {
  cjProductName: string;
  cjVariantName: string;
  cjProductSku: string | null;
  cjVariantSku: string | null;
  cjImageUrl: string | null;
  stockQuantity: number;
  stockSyncedAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(cjProductLinks).set(sync).where(and(eq(cjProductLinks.productId, productId), eq(cjProductLinks.cjProductId, cjProductId), eq(cjProductLinks.cjVariantId, cjVariantId))).returning({ id: cjProductLinks.id });
  if (!result[0]) throw new Error("CJ product mapping changed during sync; no stock data was saved.");
  return { success: true };
}

async function attachOrderItems<T extends { id: number }>(rows: T[]) {
  const db = await getDb();
  if (!db || rows.length === 0) return rows.map((row) => ({ ...row, items: [] as Array<typeof orderItems.$inferSelect> }));
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((row) => row.id)));
  return rows.map((row) => ({ ...row, items: items.filter((item) => item.orderId === row.id) }));
}

export async function listOrdersForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  return attachOrderItems(rows);
}

export async function listAllOrdersWithItems() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return attachOrderItems(rows);
}

export async function listAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getCjSupplierOrder(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const rows = await db.select({ item: orderItems, mapping: cjProductLinks }).from(orderItems)
    .leftJoin(cjProductLinks, eq(cjProductLinks.productId, orderItems.productId))
    .where(eq(orderItems.orderId, orderId));
  return { order, items: rows.map(({ item, mapping }) => ({ ...item, mapping })) };
}

export async function claimCjSupplierOrder(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [claimed] = await db.update(orders).set({
    cjOrderNumber: `OKV-${orderId}`,
    cjSubmissionStatus: "submitting",
    cjSubmissionAttemptedAt: new Date(),
    cjSubmissionError: null,
  }).where(and(
    eq(orders.id, orderId),
    eq(orders.status, "paid"),
    eq(orders.verifiedPaymentMode, "live"),
    isNotNull(orders.verifiedPaymentAt),
    isNull(orders.cjSubmissionStatus),
  )).returning({ id: orders.id, cjOrderNumber: orders.cjOrderNumber });
  return claimed ?? null;
}

export async function claimCjSupplierOrderRetry(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [claimed] = await db.update(orders).set({
    cjOrderNumber: `OKV-${orderId}`,
    cjSubmissionStatus: "submitting",
    cjSubmissionAttemptedAt: new Date(),
    cjSubmissionError: null,
  }).where(and(
    eq(orders.id, orderId),
    eq(orders.status, "paid"),
    eq(orders.verifiedPaymentMode, "live"),
    isNotNull(orders.verifiedPaymentAt),
    eq(orders.cjSubmissionStatus, "blocked"),
    isNull(orders.cjOrderId),
  )).returning({ id: orders.id, cjOrderNumber: orders.cjOrderNumber });
  return claimed ?? null;
}

export async function setCjSupplierOrderState(orderId: number, state: "blocked" | "needs_reconciliation", message: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [updated] = await db.update(orders).set({ cjSubmissionStatus: state, cjSubmissionError: message.slice(0, 1000) })
    .where(and(eq(orders.id, orderId), eq(orders.cjSubmissionStatus, "submitting"), eq(orders.verifiedPaymentMode, "live"), isNotNull(orders.verifiedPaymentAt)))
    .returning({ id: orders.id });
  return Boolean(updated);
}

export async function saveCjSupplierOrderResult(orderId: number, result: { orderId: string; orderCode: string | null; orderStatus: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [updated] = await db.update(orders).set({
    cjOrderId: result.orderId,
    cjOrderCode: result.orderCode,
    cjOrderStatus: result.orderStatus,
    cjSubmissionStatus: "created_unpaid",
    cjSubmissionError: null,
  }).where(and(eq(orders.id, orderId), eq(orders.status, "paid"), eq(orders.cjSubmissionStatus, "submitting"), eq(orders.verifiedPaymentMode, "live"), isNotNull(orders.verifiedPaymentAt)))
    .returning({ id: orders.id });
  return Boolean(updated);
}

export async function saveCjOrderReconciliation(orderId: number, result: { orderId: string; orderCode: string | null; orderStatus: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [updated] = await db.update(orders).set({
    cjOrderId: result.orderId,
    cjOrderCode: result.orderCode,
    cjOrderStatus: result.orderStatus,
    cjSubmissionStatus: "created_unpaid",
    cjSubmissionError: null,
  }).where(and(eq(orders.id, orderId), eq(orders.status, "paid"), eq(orders.verifiedPaymentMode, "live"), isNotNull(orders.verifiedPaymentAt)))
    .returning({ id: orders.id });
  return Boolean(updated);
}

export async function saveCjTracking(orderId: number, expectedCjOrderId: string, update: {
  cjOrderCode: string | null;
  cjOrderStatus: string | null;
  trackingNumber: string | null;
  trackingStatus: string | null;
  trackingProvider: string | null;
  trackingUrl: string | null;
  trackingSyncedAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [updated] = await db.update(orders).set(update).where(and(
    eq(orders.id, orderId),
    eq(orders.cjOrderId, expectedCjOrderId),
    eq(orders.cjSubmissionStatus, "created_unpaid"),
    eq(orders.verifiedPaymentMode, "live"),
    isNotNull(orders.verifiedPaymentAt),
  )).returning({ id: orders.id });
  return Boolean(updated);
}

export async function listAllBlogPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

export async function listPublishedBlogPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt));
}

export async function getPublishedBlogPost(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return result[0]?.status === "published" ? result[0] : null;
}

export async function createBlogPost(input: typeof blogPosts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [created] = await db.insert(blogPosts).values(input).returning({ id: blogPosts.id });
  if (!created) throw new Error("Database did not return the blog post ID");
  return { id: created.id };
}

export async function updateBlogPost(id: number, input: Partial<typeof blogPosts.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(blogPosts).set(input).where(eq(blogPosts.id, id));
  return { success: true };
}

export async function updateOrderStatus(id: number, status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(orders).set({ status }).where(eq(orders.id, id));
  return { success: true };
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0] ?? null;
}

type OrderStatusValue = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
export async function updateOrderStatusFrom(id: number, from: OrderStatusValue, to: OrderStatusValue) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const updated = await db.update(orders).set({ status: to }).where(and(eq(orders.id, id), eq(orders.status, from))!).returning({ id: orders.id });
  return { success: updated.length > 0 };
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return { success: true };
}

export async function listContactMessages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
}
