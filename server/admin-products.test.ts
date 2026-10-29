import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getProductBySlug: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getAdminProductWithCjLink: vi.fn(),
  getCjProductLinkByProductId: vi.fn(),
  importCjProductDraft: vi.fn(),
}));

const cjClientMocks = vi.hoisted(() => ({
  searchCatalogProducts: vi.fn(),
  getCatalogProduct: vi.fn(),
  syncProduct: vi.fn(),
  createSupplierOrder: vi.fn(),
  getOrderDetail: vi.fn(),
  getTrackingInfo: vi.fn(),
}));

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

vi.mock("./suppliers/cj.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./suppliers/cj.js")>();
  return { ...actual, createCjClient: vi.fn(() => cjClientMocks as unknown as ReturnType<typeof actual.createCjClient>) };
});

const { appRouter } = await import("./routers/index");

const caller = () => appRouter.createCaller({
  user: { id: 1, openId: "admin", name: "Admin", email: "admin@example.com", role: "admin" } as TrpcContext["user"],
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
});

const product = { name: "Solar lamp", slug: "solar-lamp", category: "Electronics", description: "A bright solar lamp.", specifications: {}, priceKobo: 250000 };

describe("admin product mutations", () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach((mock) => mock.mockReset());
    Object.values(cjClientMocks).forEach((mock) => mock.mockReset());
    dbMocks.createProduct.mockResolvedValue({ success: true });
    dbMocks.updateProduct.mockResolvedValue({ success: true });
    dbMocks.deleteProduct.mockResolvedValue({ found: true, deletable: true, deleted: true, archived: false, orderItemCount: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a duplicate slug on create with CONFLICT", async () => {
    dbMocks.getProductBySlug.mockResolvedValue({ id: 3, slug: "solar-lamp" });
    await expect(caller().admin.createProduct(product)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(dbMocks.createProduct).not.toHaveBeenCalled();
  });

  it("allows a product to keep its own slug on update but not take another's", async () => {
    dbMocks.getProductBySlug.mockResolvedValue({ id: 3, slug: "solar-lamp" });
    await expect(caller().admin.updateProduct({ id: 3, slug: "solar-lamp" })).resolves.toEqual({ success: true });
    await expect(caller().admin.updateProduct({ id: 4, slug: "solar-lamp" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects a zero price", async () => {
    dbMocks.getProductBySlug.mockResolvedValue(null);
    await expect(caller().admin.createProduct({ ...product, priceKobo: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().admin.updateProduct({ id: 3, priceKobo: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("toggles isActive", async () => {
    await expect(caller().admin.updateProduct({ id: 3, isActive: 0 })).resolves.toEqual({ success: true });
    expect(dbMocks.updateProduct).toHaveBeenCalledWith(3, expect.objectContaining({ isActive: 0 }));
  });

  it("marks new products created through Admin", async () => {
    dbMocks.getProductBySlug.mockResolvedValue(null);
    await caller().admin.createProduct(product);
    expect(dbMocks.createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: product.name, adminCreatedAt: expect.any(Date) }));
  });

  it("imports a selected CJ variant only into an Admin draft", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CJ_SYNC_ENABLED", "true");
    vi.stubEnv("CJ_API_KEY", "fixture-cj-key");
    dbMocks.getProductBySlug.mockResolvedValue(null);
    dbMocks.importCjProductDraft.mockResolvedValue({ id: 90 });
    cjClientMocks.getCatalogProduct.mockResolvedValue({
      id: "cj-product-1", name: "CJ lamp", sku: "CJ-LAMP", category: "Lighting", description: "Portable lamp details.", imageUrl: "https://cf.cjdropshipping.com/lamp.jpg", supplierPriceUsd: 4.5,
      variants: [{ id: "variant-1", name: "Black", sku: "CJ-LAMP-BLK", imageUrl: "https://cf.cjdropshipping.com/lamp-black.jpg", priceUsd: 4.75, stockQuantity: 12 }],
    });

    await expect(caller().admin.importCjProductDraft({
      cjProductId: "cj-product-1", cjVariantId: "variant-1", name: "Retail lamp", slug: "retail-lamp", category: "Lighting", description: "Retail-ready lamp description.", priceKobo: 125000, unit: "each",
    })).resolves.toEqual({ id: 90, draft: true, isActive: 0 });
    expect(cjClientMocks.getCatalogProduct).toHaveBeenCalledWith("cj-product-1");
    expect(dbMocks.importCjProductDraft).toHaveBeenCalledWith(expect.objectContaining({
      cjProductId: "cj-product-1", cjVariantId: "variant-1", cjVariantSku: "CJ-LAMP-BLK", cjVariantName: "Black", currency: "NGN", imageUrl: "https://cf.cjdropshipping.com/lamp-black.jpg",
    }));
    expect(dbMocks.createProduct).not.toHaveBeenCalled();
  });

  it("does not allow generic product updates to publish an imported CJ draft", async () => {
    dbMocks.getAdminProductWithCjLink.mockResolvedValue({ product: { id: 90, isActive: 0 }, cjLink: { cjImportedAt: new Date() } });
    await expect(caller().admin.updateProduct({ id: 90, isActive: 1 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(dbMocks.updateProduct).not.toHaveBeenCalled();
  });

  it("activates an imported CJ draft only after deliberate review with fresh positive stock", async () => {
    dbMocks.getAdminProductWithCjLink.mockResolvedValue({
      product: { id: 90, name: "Retail lamp", slug: "retail-lamp", description: "Retail-ready lamp description.", priceKobo: 125000, unit: "each", adminCreatedAt: new Date(), isActive: 0 },
      cjLink: { cjImportedAt: new Date(), cjProductId: "cj-product-1", cjVariantId: "variant-1", cjVariantSku: "CJ-LAMP-BLK", isFixedVariant: true, stockSyncedAt: new Date(), stockQuantity: 12 },
    });
    await expect(caller().admin.activateCjImportedProduct({ id: 90, confirmReviewed: true })).resolves.toEqual({ success: true, alreadyActive: false });
    expect(dbMocks.updateProduct).toHaveBeenCalledWith(90, expect.objectContaining({ isActive: 1, updatedAt: expect.any(Date) }));
  });

  it("keeps imported CJ drafts inactive when stock is stale or unavailable", async () => {
    dbMocks.getAdminProductWithCjLink.mockResolvedValue({
      product: { id: 90, name: "Retail lamp", slug: "retail-lamp", description: "Retail-ready lamp description.", priceKobo: 125000, unit: "each", adminCreatedAt: new Date(), isActive: 0 },
      cjLink: { cjImportedAt: new Date(), cjProductId: "cj-product-1", cjVariantId: "variant-1", cjVariantSku: "CJ-LAMP-BLK", isFixedVariant: true, stockSyncedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), stockQuantity: 12 },
    });
    await expect(caller().admin.activateCjImportedProduct({ id: 90, confirmReviewed: true })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(dbMocks.updateProduct).not.toHaveBeenCalled();
  });

  it("deletes products with no order history", async () => {
    await expect(caller().admin.deleteProduct({ id: 3 })).resolves.toEqual({ deleted: true, archived: false, orderItemCount: 0 });
    expect(dbMocks.deleteProduct).toHaveBeenCalledWith(3);
  });

  it("reports historical products as archived rather than deleted", async () => {
    dbMocks.deleteProduct.mockResolvedValue({ found: true, deletable: true, deleted: false, archived: true, orderItemCount: 2 });
    await expect(caller().admin.deleteProduct({ id: 3 })).resolves.toEqual({ deleted: false, archived: true, orderItemCount: 2 });
  });

  it("refuses to delete products that were not created through Admin", async () => {
    dbMocks.deleteProduct.mockResolvedValue({ found: true, deletable: false, deleted: false, archived: false, orderItemCount: 0 });
    await expect(caller().admin.deleteProduct({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns NOT_FOUND when the product no longer exists", async () => {
    dbMocks.deleteProduct.mockResolvedValue({ found: false, deletable: false, deleted: false, archived: false, orderItemCount: 0 });
    await expect(caller().admin.deleteProduct({ id: 3 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
