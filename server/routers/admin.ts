import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc.js";
import {
  createBlogPost,
  createProduct,
  deleteBlogPost,
  getProductBySlug,
  listAllBlogPosts,
  listAllProducts,
  listContactMessages,
  updateBlogPost,
  updateExportInquiryStatus,
  updateProduct,
} from "../db.js";
import { blogPostInput, blogPostUpdateInput } from "./blog.js";
import { adminOrderProcedures } from "./orders.js";

const productInput = z.object({
  name: z.string().min(2).max(180),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(200),
  category: z.string().min(2).max(80),
  description: z.string().min(10),
  specifications: z.record(z.string(), z.string()),
  priceKobo: z.number().int().positive("Price must be greater than zero."),
  currency: z.string().max(8).default("NGN"),
  unit: z.string().max(40).default("per item"),
  imageUrl: z.string().url().optional(),
});
const productUpdateInput = productInput.partial().extend({
  id: z.number().int().positive(),
  isActive: z.union([z.literal(0), z.literal(1)]).optional(),
  imageUrl: z.string().url().nullable().optional(),
});
const inquiryStatusInput = z.object({ id: z.number().int().positive(), status: z.enum(["new", "reviewing", "quoted", "closed"]) });

const SLUG_TAKEN_MESSAGE = "Another product already uses this slug. Choose a different one.";
const isUniqueViolation = (error: unknown) => {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  return candidates.some((item) => !!item && typeof item === "object" && (item as { code?: unknown }).code === "23505");
};
async function assertSlugAvailable(slug: string, productId?: number) {
  const existing = await getProductBySlug(slug);
  if (existing && existing.id !== productId) throw new TRPCError({ code: "CONFLICT", message: SLUG_TAKEN_MESSAGE });
}
async function withSlugConflict<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (isUniqueViolation(error)) throw new TRPCError({ code: "CONFLICT", message: SLUG_TAKEN_MESSAGE });
    throw error;
  }
}

export const adminRouter = router({
  products: adminProcedure.query(() => listAllProducts()),
  orders: adminOrderProcedures.orders,
  blogPosts: adminProcedure.query(() => listAllBlogPosts()),
  contactMessages: adminProcedure.query(() => listContactMessages()),
  updateOrderStatus: adminOrderProcedures.updateOrderStatus,
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
  deleteBlogPost: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteBlogPost(input.id)),
  createProduct: adminProcedure.input(productInput).mutation(async ({ input }) => {
    await assertSlugAvailable(input.slug);
    return withSlugConflict(() => createProduct(input));
  }),
  updateProduct: adminProcedure.input(productUpdateInput).mutation(async ({ input }) => {
    const { id, ...values } = input;
    if (values.slug) await assertSlugAvailable(values.slug, id);
    return withSlugConflict(() => updateProduct(id, { ...values, updatedAt: new Date() }));
  }),
});
