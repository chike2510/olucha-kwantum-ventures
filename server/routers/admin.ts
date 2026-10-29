import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc.js";
import {
  createBlogPost,
  createProduct,
  deleteProduct,
  deleteBlogPost,
  getCjProductLinkByProductId,
  getAdminProductWithCjLink,
  importCjProductDraft,
  getProductBySlug,
  listAllBlogPosts,
  listAllProducts,
  listContactMessages,
  saveCjProductMapping,
  updateCjProductSync,
  updateBlogPost,
  updateExportInquiryStatus,
  updateProduct,
} from "../db.js";
import { ENV } from "../_core/env.js";
import { blogPostInput, blogPostUpdateInput } from "./blog.js";
import { adminOrderProcedures } from "./orders.js";
import { createCjClient } from "../suppliers/cj.js";
import { isCjAutoOrderAvailable, reconcileCjSupplierOrder, retryCjSupplierOrder, syncCjTrackingForOrder } from "../suppliers/cjFulfillment.js";

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
const productUpdateInput = productInput.partial().extend({ id: z.number().int().positive(), isActive: z.union([z.literal(0), z.literal(1)]).optional(), imageUrl: z.string().url().nullable().optional() });
const inquiryStatusInput = z.object({ id: z.number().int().positive(), status: z.enum(["new", "reviewing", "quoted", "closed"]) });
const cjMappingInput = z.object({
  productId: z.number().int().positive(),
  cjProductId: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9-]+$/),
  cjVariantId: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9-]+$/),
});

const SLUG_TAKEN_MESSAGE = "Another product already uses this slug. Choose a different one.";
const isUniqueViolation = (error: unknown) => [error, (error as { cause?: unknown } | null)?.cause].some((item) => !!item && typeof item === "object" && (item as { code?: unknown }).code === "23505");
async function assertSlugAvailable(slug: string, productId?: number) {
  const existing = await getProductBySlug(slug);
  if (existing && existing.id !== productId) throw new TRPCError({ code: "CONFLICT", message: SLUG_TAKEN_MESSAGE });
}
async function withSlugConflict<T>(run: () => Promise<T>) {
  try { return await run(); } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (isUniqueViolation(error)) throw new TRPCError({ code: "CONFLICT", message: SLUG_TAKEN_MESSAGE });
    throw error;
  }
}
function requirePreviewEnvironment(): void {
  if (ENV.vercelEnv !== "preview") throw new TRPCError({ code: "FORBIDDEN", message: "CJ operations are available only in the approved Preview deployment." });
}
let cachedCjClient: ReturnType<typeof createCjClient> | null = null;
let cachedCjApiKey = "";
function getPreviewCjClient(): ReturnType<typeof createCjClient> {
  requirePreviewEnvironment();
  if (!ENV.cjSyncEnabled || !ENV.cjApiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "CJ sync is not configured for this Preview deployment." });
  if (!cachedCjClient || cachedCjApiKey !== ENV.cjApiKey) {
    cachedCjApiKey = ENV.cjApiKey;
    cachedCjClient = createCjClient(cachedCjApiKey);
  }
  return cachedCjClient;
}

export const adminRouter = router({
  products: adminProcedure.query(() => listAllProducts()),
  orders: adminOrderProcedures.orders,
  blogPosts: adminProcedure.query(() => listAllBlogPosts()),
  contactMessages: adminProcedure.query(() => listContactMessages()),
  updateOrderStatus: adminOrderProcedures.updateOrderStatus,
  updateInquiryStatus: adminProcedure.input(inquiryStatusInput).mutation(({ input }) => updateExportInquiryStatus(input.id, input.status)),
  createBlogPost: adminProcedure.input(blogPostInput).mutation(({ input }) => createBlogPost({ ...input, publishedAt: input.status === "published" ? new Date() : null })),
  updateBlogPost: adminProcedure.input(blogPostUpdateInput).mutation(({ input }) => {
    const { id, ...values } = input;
    return updateBlogPost(id, { ...values, publishedAt: values.status === "published" ? new Date() : values.status === "draft" ? null : undefined });
  }),
  deleteBlogPost: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteBlogPost(input.id)),
  createProduct: adminProcedure.input(productInput).mutation(async ({ input }) => { await assertSlugAvailable(input.slug); return withSlugConflict(() => createProduct({ ...input, adminCreatedAt: new Date() })); }),
  updateProduct: adminProcedure.input(productUpdateInput).mutation(async ({ input }) => {
    const { id, ...values } = input;
    if (values.slug) await assertSlugAvailable(values.slug, id);
    if (values.isActive === 1) {
      const existing = await getAdminProductWithCjLink(id);
      if (existing?.cjLink?.cjImportedAt && existing.product.isActive !== 1) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Review and activate imported CJ drafts with the dedicated activation action." });
      }
    }
    return withSlugConflict(() => updateProduct(id, { ...values, updatedAt: new Date() }));
  }),
  activateCjImportedProduct: adminProcedure.input(z.object({ id: z.number().int().positive(), confirmReviewed: z.literal(true) })).mutation(async ({ input }) => {
    const record = await getAdminProductWithCjLink(input.id);
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "This product no longer exists." });
    const { product, cjLink } = record;
    if (!cjLink?.cjImportedAt) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This is not an imported CJ draft." });
    if (product.isActive === 1) return { success: true, alreadyActive: true };
    if (!product.adminCreatedAt || !cjLink.cjProductId || !cjLink.cjVariantId || !cjLink.cjVariantSku || cjLink.isFixedVariant !== true) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The imported CJ variant mapping is incomplete. Re-import or correct the mapping before activation." });
    }
    if (product.name.trim().length < 2 || product.slug.trim().length < 1 || product.description.trim().length < 10 || product.priceKobo < 1 || product.unit.trim().length < 1) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete the retail name, URL, description, price, and unit before activation." });
    }
    const syncedAt = cjLink.stockSyncedAt?.getTime() ?? 0;
    if (!cjLink.stockSyncedAt || Date.now() - syncedAt > 24 * 60 * 60 * 1000 || cjLink.stockQuantity === null || cjLink.stockQuantity < 1) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Refresh CJ stock and confirm at least one unit is available before activation." });
    }
    await updateProduct(input.id, { isActive: 1, updatedAt: new Date() });
    return { success: true, alreadyActive: false };
  }),
  deleteProduct: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const result = await deleteProduct(input.id);
    if (!result.found) throw new TRPCError({ code: "NOT_FOUND", message: "This product no longer exists." });
    if (!result.deletable) throw new TRPCError({ code: "FORBIDDEN", message: "Only products added through Admin can be deleted." });
    return { deleted: result.deleted, archived: result.archived, orderItemCount: result.orderItemCount };
  }),
  cjSyncStatus: adminProcedure.query(() => ({ previewEnvironment: ENV.vercelEnv === "preview", configured: ENV.vercelEnv === "preview" && ENV.cjSyncEnabled && Boolean(ENV.cjApiKey), autoOrderEnabled: isCjAutoOrderAvailable() })),
  searchCjCatalog: adminProcedure.input(z.object({ searchTerm: z.string().trim().min(2).max(200), page: z.number().int().min(1).max(1000).default(1) })).mutation(async ({ input }) => {
    try { return await getPreviewCjClient().searchCatalogProducts(input.searchTerm, input.page); }
    catch (error) { throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "CJ catalogue search failed." }); }
  }),
  getCjCatalogProduct: adminProcedure.input(z.object({ productId: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9-]+$/) })).mutation(async ({ input }) => {
    try { return await getPreviewCjClient().getCatalogProduct(input.productId); }
    catch (error) { throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "CJ product details could not be loaded." }); }
  }),
  importCjProductDraft: adminProcedure.input(z.object({
    cjProductId: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9-]+$/),
    cjVariantId: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9-]+$/),
    name: z.string().trim().min(2).max(180),
    slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(200),
    category: z.string().trim().min(2).max(80),
    description: z.string().trim().min(10).max(8000),
    specifications: z.record(z.string(), z.string()).default({}),
    priceKobo: z.number().int().positive("Price must be greater than zero."),
    unit: z.string().trim().min(1).max(40).default("per item"),
  })).mutation(async ({ input }) => {
    const client = getPreviewCjClient();
    await assertSlugAvailable(input.slug);
    try {
      const source = await client.getCatalogProduct(input.cjProductId);
      const variant = source.variants.find((candidate) => candidate.id === input.cjVariantId);
      if (!variant) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The selected CJ variant is no longer available. Refresh the details and choose again." });
      const imported = await importCjProductDraft({
        ...input,
        currency: "NGN",
        imageUrl: variant.imageUrl ?? source.imageUrl,
        cjProductName: source.name,
        cjVariantName: variant.name,
        cjProductSku: source.sku,
        cjVariantSku: variant.sku,
        cjImageUrl: variant.imageUrl ?? source.imageUrl,
      });
      return { ...imported, draft: true, isActive: 0 };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      if ((error instanceof Error && error.message.includes("already been imported")) || isUniqueViolation(error)) {
        throw new TRPCError({ code: "CONFLICT", message: "This CJ variant is already mapped or imported, or the slug is already in use." });
      }
      throw new TRPCError({ code: "BAD_GATEWAY", message: "The CJ product draft could not be saved. Check the catalogue fields and try again." });
    }
  }),
  saveCjMapping: adminProcedure.input(cjMappingInput).mutation(({ input }) => {
    requirePreviewEnvironment();
    return getCjProductLinkByProductId(input.productId).then((existing) => {
      if (existing?.cjImportedAt && (existing.cjProductId !== input.cjProductId || existing.cjVariantId !== input.cjVariantId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "An imported CJ draft is bound to its selected variant. Start a fresh import to change its source variant." });
      }
      return saveCjProductMapping(input.productId, input.cjProductId, input.cjVariantId);
    }).catch((error) => {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "CONFLICT", message: "CJ mapping could not be saved. Check the product and variant IDs." });
    });
  }),
  syncCjProduct: adminProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(async ({ input }) => {
    const client = getPreviewCjClient();
    try {
      const mapping = await getCjProductLinkByProductId(input.productId);
      if (!mapping) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Save a CJ product and variant mapping before syncing." });
      const sync = await client.syncProduct(mapping.cjProductId, mapping.cjVariantId);
      await updateCjProductSync(input.productId, mapping.cjProductId, mapping.cjVariantId, sync);
      return { productId: input.productId, cjProductName: sync.cjProductName, cjVariantName: sync.cjVariantName, stockQuantity: sync.stockQuantity, stockSyncedAt: sync.stockSyncedAt };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      const message = error instanceof Error && error.message.startsWith("The mapped CJ variant") ? error.message : "CJ sync failed. Refresh the product before retrying.";
      throw new TRPCError({ code: "BAD_GATEWAY", message });
    }
  }),
  reconcileCjOrder: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input }) => {
    if (!isCjAutoOrderAvailable()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "CJ order automation is disabled or missing explicit shipping configuration." });
    try { return await reconcileCjSupplierOrder(input.orderId); }
    catch { throw new TRPCError({ code: "BAD_GATEWAY", message: "CJ order reconciliation failed. No new supplier order was submitted." }); }
  }),
  retryCjOrder: adminProcedure.input(z.object({ orderId: z.number().int().positive(), confirmedNoMatchingOrder: z.literal(true) })).mutation(async ({ input }) => {
    if (!isCjAutoOrderAvailable()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "CJ order automation is disabled or missing explicit shipping configuration." });
    try { return await retryCjSupplierOrder(input.orderId, input.confirmedNoMatchingOrder); }
    catch { throw new TRPCError({ code: "BAD_GATEWAY", message: "The CJ order retry did not complete. Reconcile the supplier order before trying again." }); }
  }),
  syncCjTracking: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input }) => {
    try { return await syncCjTrackingForOrder(input.orderId); }
    catch (error) { throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "CJ tracking refresh failed." }); }
  }),
});
