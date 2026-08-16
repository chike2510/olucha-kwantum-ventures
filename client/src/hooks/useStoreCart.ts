import { useCallback, useEffect, useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/storeCatalog";
import { addToCart, calculateCartSubtotal, removeFromCart, updateCartQuantity, type CartLine } from "@/lib/cartState";

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
  const add = useCallback((product: StoreProduct, quantity = 1) => sync(addToCart(readCart(), product, quantity)), [sync]);
  const update = useCallback((slug: string, delta: number) => sync(updateCartQuantity(readCart(), slug, delta)), [sync]);
  const remove = useCallback((slug: string) => sync(removeFromCart(readCart(), slug)), [sync]);
  const subtotal = useMemo(() => calculateCartSubtotal(items), [items]);
  return { items, add, update, remove, subtotal };
}
