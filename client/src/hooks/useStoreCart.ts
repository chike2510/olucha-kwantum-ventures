import { useCallback, useEffect, useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/storeCatalog";

type CartLine = { product: StoreProduct; quantity: number };
const CART_KEY = "olucha-store-cart";
const CART_EVENT = "olucha-cart-updated";

function readCart(): CartLine[] {
  try {
    const value = localStorage.getItem(CART_KEY);
    return value ? JSON.parse(value) as CartLine[] : [];
  } catch {
    return [];
  }
}

export function useStoreCart() {
  const [items, setItems] = useState<CartLine[]>(readCart);
  const sync = useCallback((next: CartLine[]) => {
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CART_EVENT));
  }, []);
  useEffect(() => {
    const listener = () => setItems(readCart());
    window.addEventListener(CART_EVENT, listener);
    return () => window.removeEventListener(CART_EVENT, listener);
  }, []);
  const add = useCallback((product: StoreProduct) => {
    const existing = items.find((item) => item.product.slug === product.slug);
    sync(existing ? items.map((item) => item.product.slug === product.slug ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { product, quantity: 1 }]);
  }, [items, sync]);
  const update = useCallback((slug: string, delta: number) => sync(items.map((item) => item.product.slug === slug ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)), [items, sync]);
  const remove = useCallback((slug: string) => sync(items.filter((item) => item.product.slug !== slug)), [items, sync]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [items]);
  return { items, add, update, remove, subtotal };
}
