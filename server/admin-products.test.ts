import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getProductBySlug: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
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
    dbMocks.createProduct.mockResolvedValue({ success: true });
    dbMocks.updateProduct.mockResolvedValue({ success: true });
    dbMocks.deleteProduct.mockResolvedValue({ found: true, deletable: true, deleted: true, archived: false, orderItemCount: 0 });
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
