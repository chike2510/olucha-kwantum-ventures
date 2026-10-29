import { describe, expect, it } from "vitest";
import { getSupplierStockStatus, isSupplierQuantityAvailable, MAX_SUPPLIER_STOCK_AGE_MS } from "./supplierStock";

describe("CJ supplier stock policy", () => {
  const now = Date.parse("2026-10-26T12:00:00.000Z");

  it("leaves unmapped products available under existing checkout rules", () => {
    expect(getSupplierStockStatus({ mapped: false, stock: null, syncedAt: null, now })).toBe("unmapped");
    expect(isSupplierQuantityAvailable({ mapped: false, stock: null, syncedAt: null, quantity: 50, now })).toBe(true);
  });

  it("requires a successful stock refresh less than 24 hours old", () => {
    expect(getSupplierStockStatus({ mapped: true, stock: null, syncedAt: null, now })).toBe("refresh-required");
    expect(getSupplierStockStatus({ mapped: true, stock: 3, syncedAt: new Date(now - MAX_SUPPLIER_STOCK_AGE_MS - 1), now })).toBe("refresh-required");
    expect(getSupplierStockStatus({ mapped: true, stock: 3, syncedAt: new Date(now - MAX_SUPPLIER_STOCK_AGE_MS), now })).toBe("available");
  });

  it("blocks zero stock and requested quantities above available stock", () => {
    const syncedAt = new Date(now);
    expect(getSupplierStockStatus({ mapped: true, stock: 0, syncedAt, now })).toBe("out-of-stock");
    expect(isSupplierQuantityAvailable({ mapped: true, stock: 0, syncedAt, quantity: 1, now })).toBe(false);
    expect(isSupplierQuantityAvailable({ mapped: true, stock: 2, syncedAt, quantity: 3, now })).toBe(false);
    expect(isSupplierQuantityAvailable({ mapped: true, stock: 2, syncedAt, quantity: 2, now })).toBe(true);
  });
});
