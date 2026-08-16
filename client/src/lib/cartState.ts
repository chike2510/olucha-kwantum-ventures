import type { StoreProduct } from "./storeCatalog";

export type CartLine = { product: StoreProduct; quantity: number };

function lineKey(product: StoreProduct) { return `${product.slug}::${product.variant?.size || ""}::${product.variant?.color || ""}`; }

export function addToCart(items: CartLine[], product: StoreProduct, quantity = 1): CartLine[] {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const key = lineKey(product);
  const existing = items.find((item) => lineKey(item.product) === key);
  return existing
    ? items.map((item) => lineKey(item.product) === key ? { ...item, quantity: item.quantity + safeQuantity } : item)
    : [...items, { product, quantity: safeQuantity }];
}

export function updateCartQuantity(items: CartLine[], slug: string, delta: number): CartLine[] {
  return items.map((item) => item.product.slug === slug ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item);
}

export function removeFromCart(items: CartLine[], slug: string): CartLine[] {
  return items.filter((item) => item.product.slug !== slug);
}

export function calculateCartSubtotal(items: CartLine[]): number {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}
