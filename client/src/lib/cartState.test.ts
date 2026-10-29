import { describe, expect, it } from "vitest";
import { addToCart, calculateCartSubtotal, reconcileCart, removeFromCart, updateCartQuantity } from "./cartState";
import type { StoreProduct } from "./storeCatalog";
const product = (slug: string, price = 100): StoreProduct => ({ id: slug === "a" ? 1 : 2, slug, name: slug, category: "Electronics", price, unit: "each", description: "test", color: "from-blue-500", tag: "Available", specs: {} });
const live = (slug: string, priceKobo = 10000, isActive = 1) => ({ id: slug === "a" ? 1 : 2, slug, name: slug, category: "Electronics", priceKobo, unit: "each", description: "live", specifications: {}, imageUrl: null, isActive });
describe("store cart interaction logic", () => {
 it("adds quantities and merges identical variants", () => { const item = product("a"); let cart = addToCart([], item, 3); cart = addToCart(cart, item, 2); expect(cart[0]?.quantity).toBe(5); expect(calculateCartSubtotal(cart)).toBe(500); });
 it("keeps different variants separate", () => { const item = product("a"); const small = { ...item, variant: { size: "Small", color: "Black" } }; const large = { ...item, variant: { size: "Large", color: "Black" } }; let cart = addToCart([], small); cart = addToCart(cart, large); cart = addToCart(cart, small, 2); expect(cart).toHaveLength(2); expect(cart[0]?.quantity).toBe(3); });
 it("updates quantity and removes a product cleanly", () => { let cart = addToCart(addToCart([], product("a")), product("b"), 2); cart = updateCartQuantity(cart, "a", 2); cart = removeFromCart(cart, "b"); expect(cart[0]?.quantity).toBe(3); });
 it("drops stale lines and refreshes valid lines without losing quantity or variants", () => { const stale = { ...product("old", 999), variant: { size: "Medium" } }; const valid = { ...product("a", 100), variant: { color: "Blue" } }; const result = reconcileCart([{ product: stale, quantity: 2 }, { product: valid, quantity: 4 }], [live("a", 12500)]); expect(result).toHaveLength(1); expect(result[0]?.quantity).toBe(4); expect(result[0]?.product.price).toBe(125); expect(result[0]?.product.variant?.color).toBe("Blue"); });
});
