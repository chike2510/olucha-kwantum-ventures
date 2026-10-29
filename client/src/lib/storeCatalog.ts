import { formatNairaAmount } from "./money";

export type StoreProduct = {
  id: number; slug: string; name: string; category: "Electronics" | "Fashion" | "Agro Products";
  price: number; unit: string; description: string; color: string; tag: string;
  specs: Record<string, string>; imageUrl?: string; supplierMapped?: boolean;
  supplierStock?: number | null; supplierStockSyncedAt?: Date | null;
  variant?: { size?: string; color?: string };
};
export type CatalogueProduct = {
  id: number; slug: string; name: string; category: string; priceKobo: number; unit: string;
  description: string; specifications: Record<string, string> | null; imageUrl: string | null;
  isActive: number; supplierMapped?: boolean; supplierStock?: number | null; supplierStockSyncedAt?: Date | null;
};
export const storeCategories = ["All products", "Electronics", "Fashion", "Agro Products"] as const;
export function normalizeStoreCategory(category: string): StoreProduct["category"] {
  const normalized = category.toLowerCase();
  return normalized.includes("fashion") ? "Fashion" : normalized.includes("agro") ? "Agro Products" : "Electronics";
}
export function catalogueToStoreProduct(product: CatalogueProduct, tag = "Available"): StoreProduct {
  return { id: product.id, slug: product.slug, name: product.name, category: normalizeStoreCategory(product.category), price: product.priceKobo / 100, unit: product.unit, description: product.description, color: "from-[#1f5b9f] via-[#0b1736] to-[#cfa43a]", tag, specs: product.specifications || {}, imageUrl: product.imageUrl || undefined, supplierMapped: product.supplierMapped, supplierStock: product.supplierStock, supplierStockSyncedAt: product.supplierStockSyncedAt };
}
export function formatNaira(value: number) { return formatNairaAmount(value); }
