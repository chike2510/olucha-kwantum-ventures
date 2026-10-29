import { useCallback, useEffect, useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/storeCatalog";
import { trpc } from "@/lib/trpc";
import {
  addToCart,
  calculateCartSubtotal,
  reconcileCart,
  removeFromCart,
  updateCartQuantity,
  type CartLine,
} from "@/lib/cartState";

const CART_KEY = "olucha-store-cart";
const CART_EVENT = "olucha-cart-updated";

function readCart(): CartLine[] {
  try {
    const value = localStorage.getItem(CART_KEY);
    return value ? (JSON.parse(value) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function useStoreCart() {
  // This is the persisted snapshot. It is deliberately not reconciled or
  // overwritten until the backend catalogue has returned successfully.
  const [persistedItems, setPersistedItems] = useState<CartLine[]>(readCart);
  const catalogue = trpc.catalogue.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  const catalogueLoading = catalogue.isLoading;
  const catalogueError = catalogue.isError;
  const catalogueAvailable = catalogue.isSuccess;

  const sync = useCallback((next: CartLine[]) => {
    setPersistedItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CART_EVENT));
  }, []);

  useEffect(() => {
    const listener = () => setPersistedItems(readCart());
    window.addEventListener(CART_EVENT, listener);
    return () => window.removeEventListener(CART_EVENT, listener);
  }, []);

  useEffect(() => {
    if (!catalogueAvailable || !catalogue.data) return;
    const next = reconcileCart(readCart(), catalogue.data);
    if (JSON.stringify(next) !== JSON.stringify(readCart())) sync(next);
  }, [catalogueAvailable, catalogue.data, sync]);

  // Never expose stale localStorage product objects while the active backend
  // catalogue is unavailable. A successful query is the source of truth.
  const items = useMemo(
    () =>
      catalogueAvailable && catalogue.data
        ? reconcileCart(persistedItems, catalogue.data)
        : [],
    [catalogueAvailable, catalogue.data, persistedItems]
  );

  const add = useCallback(
    (product: StoreProduct, quantity = 1) => {
      if (
        !catalogueAvailable ||
        !catalogue.data?.some(
          candidate =>
            candidate.slug === product.slug && Boolean(candidate.isActive)
        )
      )
        return;
      const current = reconcileCart(readCart(), catalogue.data);
      sync(
        reconcileCart(addToCart(current, product, quantity), catalogue.data)
      );
    },
    [catalogueAvailable, catalogue.data, sync]
  );

  const update = useCallback(
    (slug: string, delta: number) => {
      if (!catalogueAvailable || !catalogue.data) return;
      sync(
        reconcileCart(
          updateCartQuantity(readCart(), slug, delta),
          catalogue.data
        )
      );
    },
    [catalogueAvailable, catalogue.data, sync]
  );

  const remove = useCallback(
    (slug: string) => {
      if (!catalogueAvailable || !catalogue.data) return;
      sync(reconcileCart(removeFromCart(readCart(), slug), catalogue.data));
    },
    [catalogueAvailable, catalogue.data, sync]
  );

  const clear = useCallback(() => sync([]), [sync]);
  const subtotal = useMemo(() => calculateCartSubtotal(items), [items]);

  return {
    items,
    add,
    update,
    remove,
    clear,
    subtotal,
    catalogueLoading,
    catalogueError,
  };
}
