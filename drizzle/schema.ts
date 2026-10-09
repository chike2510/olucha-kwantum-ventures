import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const exportInquiryStatusEnum = pgEnum("export_inquiry_status", ["new", "reviewing", "quoted", "closed"]);
export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "processing", "shipped", "delivered", "cancelled"]);
export const paymentIntentStatusEnum = pgEnum("payment_intent_status", ["initializing", "pending", "failed", "cancelled", "paid"]);

const timestampColumn = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestampColumn("createdAt").defaultNow().notNull(),
  updatedAt: timestampColumn("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestampColumn("lastSignedIn").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  category: varchar("category", { length: 80 }).notNull(),
  description: text("description").notNull(),
  specifications: jsonb("specifications").$type<Record<string, string>>().notNull(),
  priceKobo: integer("priceKobo").notNull(),
  currency: varchar("currency", { length: 8 }).default("NGN").notNull(),
  unit: varchar("unit", { length: 40 }).default("per item").notNull(),
  imageUrl: text("imageUrl"),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestampColumn("createdAt").defaultNow().notNull(),
  updatedAt: timestampColumn("updatedAt").defaultNow().notNull(),
});

export const exportInquiries = pgTable("export_inquiries", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  productInterest: varchar("productInterest", { length: 180 }).notNull(),
  quantity: varchar("quantity", { length: 120 }),
  destinationCountry: varchar("destinationCountry", { length: 100 }).notNull(),
  message: text("message"),
  status: exportInquiryStatusEnum("status").default("new").notNull(),
  createdAt: timestampColumn("createdAt").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestampColumn("createdAt").defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 240 }).notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  status: blogPostStatusEnum("status").default("draft").notNull(),
  publishedAt: timestampColumn("publishedAt"),
  createdAt: timestampColumn("createdAt").defaultNow().notNull(),
  updatedAt: timestampColumn("updatedAt").defaultNow().notNull(),
});

export type PaymentIntentLine = {
  productId: number;
  productName: string;
  quantity: number;
  unitPriceKobo: number;
  variant?: { size?: string; color?: string } | null;
};

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 50 }),
  deliveryCountry: varchar("deliveryCountry", { length: 100 }),
  deliveryAddress: text("deliveryAddress"),
  totalKobo: integer("totalKobo").notNull(),
  currency: varchar("currency", { length: 8 }).default("NGN").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  paystackReference: varchar("paystackReference", { length: 120 }).unique(),
  createdAt: timestampColumn("createdAt").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId").notNull(),
  productName: varchar("productName", { length: 180 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceKobo: integer("unitPriceKobo").notNull(),
  variant: jsonb("variant").$type<{ size?: string; color?: string } | null>(),
});

export const paymentIntents = pgTable("payment_intents", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 120 }).notNull().unique(),
  userId: integer("userId"),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 50 }).notNull(),
  deliveryCountry: varchar("deliveryCountry", { length: 100 }).notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  totalKobo: integer("totalKobo").notNull(),
  currency: varchar("currency", { length: 8 }).notNull(),
  lines: jsonb("lines").$type<PaymentIntentLine[]>().notNull(),
  status: paymentIntentStatusEnum("status").default("initializing").notNull(),
  createdAt: timestampColumn("createdAt").defaultNow().notNull(),
  updatedAt: timestampColumn("updatedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
