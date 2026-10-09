import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
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
  Product,
  InsertProduct,
} from "../drizzle/schema.js";
import { SUPABASE_ROOT_CA } from "./db-ca.js";
import { ENV } from "./_core/env.js";
import { notifyOwner } from "./_core/notification.js";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
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
        // Supabase recommends a single app-side connection for serverless instances.
        max: 1,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 10_000,
        allowExitOnIdle: true,
      });
      _pool.on("error", (error) => console.warn("[Database] Idle PostgreSQL connection error:", error));
      // Drizzle's node-postgres adapter sends unnamed queries; Supavisor transaction mode
      // does not support explicitly named/prepared statements.
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
  if (search) {
    filters.push(or(
      ilike(products.name, `%${search}%`),
      ilike(products.category, `%${search}%`),
      ilike(products.description, `%${search}%`),
    )!);
  }
  return db.select().from(products).where(and(...filters)!).orderBy(desc(products.createdAt));
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function createProduct(input: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(products).values(input);
  return { success: true };
}

export async function updateProduct(id: number, input: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(products).set(input).where(eq(products.id, id));
  return { success: true };
}

export async function createExportInquiry(input: typeof exportInquiries.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [created] = await db.insert(exportInquiries).values(input).returning({ id: exportInquiries.id });
  await notifyOwner({
    title: "New export inquiry",
    content: `${input.fullName} requested ${input.productInterest} for ${input.destinationCountry}. Contact: ${input.email}. Quantity: ${input.quantity || "Not specified"}.`,
  }).catch((error) => console.warn("[Notification] Export inquiry alert failed:", error));
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
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function listOrdersForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function listAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
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
