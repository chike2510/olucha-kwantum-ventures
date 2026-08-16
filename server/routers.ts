import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createContactMessage, createExportInquiry, createProduct, createOrder, getProductBySlug, listAllBlogPosts, listAllOrders, listAllProducts, listExportInquiries, listOrdersForUser, listProducts, updateOrderStatus } from "./db";

const inquiryInput = z.object({ fullName: z.string().min(2).max(160), email: z.string().email(), phone: z.string().max(50).optional(), productInterest: z.string().min(2).max(180), quantity: z.string().max(120).optional(), destinationCountry: z.string().min(2).max(100), message: z.string().max(5000).optional() });
const productInput = z.object({ name: z.string().min(2).max(180), slug: z.string().regex(/^[a-z0-9-]+$/).max(200), category: z.string().min(2).max(80), description: z.string().min(10), specifications: z.record(z.string(), z.string()), priceKobo: z.number().int().nonnegative(), currency: z.string().max(8).default("NGN"), unit: z.string().max(40).default("per item"), imageUrl: z.string().url().optional() });
const orderInput = z.object({ customerName: z.string().min(2).max(160), customerEmail: z.string().email(), totalKobo: z.number().int().positive(), currency: z.string().max(8).default("NGN"), lines: z.array(z.object({ productId: z.number().int().positive(), productName: z.string().min(2).max(180), quantity: z.number().int().positive().max(999), unitPriceKobo: z.number().int().nonnegative() })).min(1) });
const orderStatusInput = z.object({ id: z.number().int().positive(), status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled"]) });

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  catalogue: router({ list: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional()).query(({ input }) => listProducts(input?.search, input?.category)), bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getProductBySlug(input.slug)) }),
  inquiries: router({ create: publicProcedure.input(inquiryInput).mutation(({ input }) => createExportInquiry(input)), adminList: adminProcedure.query(() => listExportInquiries()) }),
  contact: router({ create: publicProcedure.input(z.object({ fullName: z.string().min(2).max(160), email: z.string().email(), message: z.string().min(2).max(5000) })).mutation(({ input }) => createContactMessage(input)) }),
  admin: router({ products: adminProcedure.query(() => listAllProducts()), orders: adminProcedure.query(() => listAllOrders()), blogPosts: adminProcedure.query(() => listAllBlogPosts()), updateOrderStatus: adminProcedure.input(orderStatusInput).mutation(({ input }) => updateOrderStatus(input.id, input.status)), createProduct: adminProcedure.input(productInput).mutation(({ input }) => createProduct(input)) }),
  account: router({ me: protectedProcedure.query(({ ctx }) => ctx.user), orders: protectedProcedure.query(({ ctx }) => listOrdersForUser(ctx.user.id)), createOrder: protectedProcedure.input(orderInput).mutation(({ ctx, input }) => createOrder({ ...input, userId: ctx.user.id })) }),
});
export type AppRouter = typeof appRouter;
