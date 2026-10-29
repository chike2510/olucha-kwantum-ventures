export const MAX_SUPPLIER_STOCK_AGE_MS = 24 * 60 * 60 * 1000;

export type SupplierStockStatus = "unmapped" | "refresh-required" | "out-of-stock" | "available";

export type SupplierStockInput = {
  mapped: boolean;
  stock: number | null;
  syncedAt: Date | null;
  now?: number;
};

export function getSupplierStockStatus(input: SupplierStockInput): SupplierStockStatus {
  if (!input.mapped) return "unmapped";
  const syncedAt = input.syncedAt;
  if (
    input.stock === null ||
    !Number.isSafeInteger(input.stock) ||
    input.stock < 0 ||
    !(syncedAt instanceof Date) ||
    !Number.isFinite(syncedAt.getTime()) ||
    (input.now ?? Date.now()) - syncedAt.getTime() > MAX_SUPPLIER_STOCK_AGE_MS
  ) return "refresh-required";
  return input.stock === 0 ? "out-of-stock" : "available";
}

export function isSupplierQuantityAvailable(input: SupplierStockInput & { quantity: number }): boolean {
  const status = getSupplierStockStatus(input);
  if (status === "unmapped") return true;
  return status === "available" && input.stock !== null && input.quantity <= input.stock;
}
