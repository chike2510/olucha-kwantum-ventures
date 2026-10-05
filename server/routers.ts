import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { ENV } from "./_core/env.js";
import { systemRouter } from "./_core/systemRouter.js";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import {
  createBlogPost,
  createContactMessage,
  createExportInquiry,
  createProduct,
  getProductBySlug,
  getPublishedBlogPost,
  listAllBlogPosts,
  listAllOrders,
  listAllProducts,
  listExportInquiries,
  listOrdersForUser,
  listProducts,
  listPublishedBlogPosts,
  updateBlogPost,
  updateExportInquiryStatus,
  updateOrderStatus,
  updateProduct,
} from "./db.js";
import { initializePaymentCheckout } from "./payments/index.js";

const inquiryInput = z.object({
  fullName: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  productInterest: z.string().min(2).max(180),
  quantity: z.string().max(120).optional(),
  destinationCountry: z.string().min(2).max(100),
  message: z.string().max(5000).optional(),
});
const productInput = z.object({
  name: z.string().min(2).max(180),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(200),
  category: z.string().min(2).max(80),
  description: z.string().min(10),
  specifications: z.record(z.string(), z.string()),
  priceKobo: z.number().int().nonnegative(),
  currency: z.string().max(8).default("NGN"),
  unit: z.string().max(40).default("per item"),
  imageUrl: z.string().url().optional(),
});
const paymentCheckoutInput = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().trim().email().max(320),
  customerPhone: z.string().trim().min(7).max(50),
  deliveryCountry: z.string().trim().min(2).max(100),
  deliveryAddress: z.string().trim().min(8).max(2000),
  coupon: z.string().trim().max(40).optional(),
  items: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]{1,200}$/),
    quantity: z.number().int().min(1).max(99),
    variant: z.object({
      size: z.string().trim().max(80).optional(),
      color: z.string().trim().max(80).optional(),
    }).optional(),
  })).min(1).max(20),
});
const orderStatusInput = z.object({
  id: z.number().int().positive(),
  status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled"]),
});
const inquiryStatusInput = z.object({ id: z.number().int().positive(), status: z.enum(["new", "reviewing", "quoted", "closed"]) });
const productUpdateInput = productInput.partial().extend({ id: z.number().int().positive() });
const blogPostInput = z.object({
  title: z.string().min(4).max(220),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(240),
  excerpt: z.string().min(10),
  content: z.string().min(20),
  status: z.enum(["draft", "published"]).default("draft"),
});
const blogPostUpdateInput = blogPostInput.partial().extend({ id: z.number().int().positive() });

const safeCheckoutMessages = new Set([
  "Paystack test mode is not configured.",
  "Sign in to continue to secure checkout.",
  "The checkout host is not configured.",
  "Your cart could not be checked. Please review it and try again.",
  "One or more products are unavailable. Please refresh your cart.",
  "A cart quantity is invalid.",
  "One or more products cannot be purchased in this checkout.",
  "The cart total is invalid.",
  "The cart total is outside the supported range.",
  "Payment could not be started. No order was created; please try again.",
]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const response = ctx.res as any;
      if (typeof response.clearCookie === "function") response.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      else response.cookie(COOKIE_NAME, "", { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalogue: router({
    list: publicProcedure.input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional())
      .query(({ input }) => listProducts(input?.search, input?.category)),
    bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getProductBySlug(input.slug)),
  }),
  news: router({
    list: publicProcedure.query(() => listPublishedBlogPosts()),
    bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getPublishedBlogPost(input.slug)),
  }),
  inquiries: router({
    create: publicProcedure.input(inquiryInput).mutation(({ input }) => createExportInquiry(input)),
    adminList: adminProcedure.query(() => listExportInquiries()),
  }),
  contact: router({
    create: publicProcedure.input(z.object({
      fullName: z.string().min(2).max(160),
      email: z.string().email(),
      message: z.string().min(2).max(5000),
    })).mutation(({ input }) => createContactMessage(input)),
  }),
  payments: router({
    initialize: protectedProcedure.input(paymentCheckoutInput).mutation(async ({ ctx, input }) => {
      const origin = ctx.req.get("x-worker-request-origin") || `${ctx.req.protocol}://${ctx.req.get("host") || ""}`;
      try {
        return await initializePaymentCheckout(input, ctx.user.id, origin, ENV.paystackSecretKey);
      } catch (error) {
        const message = error instanceof Error && safeCheckoutMessages.has(error.message)
          ? error.message
          : "Secure checkout is temporarily unavailable. Please try again later.";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
  }),
  admin: router({
    products: adminProcedure.query(() => listAllProducts()),
    orders: adminProcedure.query(() => listAllOrders()),
    blogPosts: adminProcedure.query(() => listAllBlogPosts()),
    updateOrderStatus: adminProcedure.input(orderStatusInput).mutation(({ input }) => updateOrderStatus(input.id, input.status)),
    updateInquiryStatus: adminProcedure.input(inquiryStatusInput).mutation(({ input }) => updateExportInquiryStatus(input.id, input.status)),
    createBlogPost: adminProcedure.input(blogPostInput).mutation(({ input }) => createBlogPost({
      ...input,
      publishedAt: input.status === "published" ? new Date() : null,
    })),
    updateBlogPost: adminProcedure.input(blogPostUpdateInput).mutation(({ input }) => {
      const { id, ...values } = input;
      return updateBlogPost(id, {
        ...values,
        publishedAt: values.status === "published" ? new Date() : values.status === "draft" ? null : undefined,
      });
    }),
    createProduct: adminProcedure.input(productInput).mutation(({ input }) => createProduct(input)),
    updateProduct: adminProcedure.input(productUpdateInput).mutation(({ input }) => {
      const { id, ...values } = input;
      return updateProduct(id, values);
    }),
  }),
  account: router({
    me: protectedProcedure.query(({ ctx }) => ctx.user),
    orders: protectedProcedure.query(({ ctx }) => listOrdersForUser(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
