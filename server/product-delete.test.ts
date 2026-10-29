import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { products, orderItems } from "../drizzle/schema";

const drivers = vi.hoisted(() => ({
  pool: vi.fn().mockImplementation(() => ({ on: vi.fn() })),
  drizzle: vi.fn(),
}));
vi.mock("pg", () => ({ Pool: drivers.pool }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: drivers.drizzle }));

const { setWorkerEnvironment } = await import("./_core/env");
const { deleteProduct, listAllProducts } = await import("./db");

const targetId = 741;
const dialect = new PgDialect();
let lock: ReturnType<typeof vi.fn>;
let history: ReturnType<typeof vi.fn>;
let productWhere: ReturnType<typeof vi.fn>;
let historyWhere: ReturnType<typeof vi.fn>;
let updateSet: ReturnType<typeof vi.fn>;
let updateWhere: ReturnType<typeof vi.fn>;
let deleteWhere: ReturnType<typeof vi.fn>;
let deletedRows: ReturnType<typeof vi.fn>;
let tx: { select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  setWorkerEnvironment({ HYPERDRIVE: { connectionString: "postgresql://isolated:test@database.invalid/test" } });
  lock = vi.fn().mockResolvedValue([{ id: targetId, adminCreatedAt: new Date("2026-01-01") }]);
  history = vi.fn().mockReturnValue({ where: historyWhere = vi.fn().mockResolvedValue([{ count: 0 }]) });
  productWhere = vi.fn().mockReturnValue({ for: lock });
  updateWhere = vi.fn().mockResolvedValue([]);
  updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  deletedRows = vi.fn().mockResolvedValue([{ id: targetId }]);
  deleteWhere = vi.fn().mockReturnValue({ returning: deletedRows });
  tx = {
    select: vi.fn()
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: productWhere }) })
      .mockReturnValueOnce({ from: history }),
    update: vi.fn().mockReturnValue({ set: updateSet }),
    delete: vi.fn().mockReturnValue({ where: deleteWhere }),
  };
  drivers.drizzle.mockReturnValue({ transaction: vi.fn(async (run) => run(tx)) });
});

afterEach(() => setWorkerEnvironment({}));

describe("Admin product deletion database path", () => {
  it("locks and deletes only the requested Admin-created product with no order history", async () => {
    await expect(deleteProduct(targetId)).resolves.toEqual({ found: true, deletable: true, deleted: true, archived: false, orderItemCount: 0 });
    expect(lock).toHaveBeenCalledWith("update");
    expect(history).toHaveBeenCalledWith(orderItems);
    expect(tx.delete).toHaveBeenCalledOnce();
    expect(tx.delete).toHaveBeenCalledWith(products);
    expect(deletedRows).toHaveBeenCalledWith({ id: products.id });
    expect(dialect.sqlToQuery(deleteWhere.mock.calls[0][0]).params).toEqual([targetId]);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("keeps historical order lines intact and hides their product instead of deleting it", async () => {
    historyWhere.mockResolvedValue([{ count: 2 }]);
    await expect(deleteProduct(targetId)).resolves.toEqual({ found: true, deletable: true, deleted: false, archived: true, orderItemCount: 2 });
    expect(tx.update).toHaveBeenCalledWith(products);
    expect(updateSet).toHaveBeenCalledWith({ isActive: 0, updatedAt: expect.any(Date) });
    expect(dialect.sqlToQuery(updateWhere.mock.calls[0][0]).params).toEqual([targetId]);
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("does not delete a product without Admin provenance", async () => {
    lock.mockResolvedValue([{ id: targetId, adminCreatedAt: null }]);
    await expect(deleteProduct(targetId)).resolves.toMatchObject({ found: true, deletable: false, deleted: false, archived: false });
    expect(history).not.toHaveBeenCalled();
    expect(tx.delete).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("does not mutate any row when the requested product does not exist", async () => {
    lock.mockResolvedValue([]);
    await expect(deleteProduct(targetId)).resolves.toMatchObject({ found: false, deletable: false, deleted: false });
    expect(tx.delete).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("does not report success when the database rejects the deletion", async () => {
    deletedRows.mockRejectedValue(Object.assign(new Error("permission denied"), { code: "42501" }));
    await expect(deleteProduct(targetId)).rejects.toMatchObject({ code: "42501" });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("does not report success when the database removes no product", async () => {
    deletedRows.mockResolvedValue([]);
    await expect(deleteProduct(targetId)).rejects.toThrow("The product could not be removed.");
  });
});

describe("Preview product-delete privilege migration", () => {
  it("grants only product DELETE to the existing server-only app role", () => {
    const migration = readFileSync(new URL("../supabase/migrations/0005_admin_product_delete_privilege.sql", import.meta.url), "utf8")
      .replace(/--[^\n]*/g, "").trim();
    expect(migration).toBe("GRANT DELETE ON TABLE public.products TO okv_preview_app;");
  });
});

describe("Admin product read-after-write freshness", () => {
  it("bypasses Hyperdrive query caching with a real stable function and omits that marker from the response", async () => {
    const limit = vi.fn().mockResolvedValue([{ product: { id: 19, name: "Isolated fixture" }, cjLink: null, readAt: new Date() }]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const leftJoin = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ leftJoin });
    const select = vi.fn().mockReturnValue({ from });
    drivers.drizzle.mockReturnValue({ select });

    await expect(listAllProducts()).resolves.toEqual([{ id: 19, name: "Isolated fixture", cjLink: null }]);
    expect(dialect.sqlToQuery(select.mock.calls[0][0].readAt).sql).toBe("current_timestamp");
    expect(from).toHaveBeenCalledWith(products);
    expect(limit).toHaveBeenCalledWith(200);
  });
});
