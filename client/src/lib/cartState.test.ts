import { describe, expect, it } from "vitest";
import { addToCart, calculateCartSubtotal, removeFromCart, updateCartQuantity } from "./cartState";
import { storeProducts } from "./storeCatalog";

describe("store cart interaction logic", () => {
  it("adds a selected quantity and increments repeated additions", () => {
    const product = storeProducts[0]!;
    let cart = addToCart([], product, 3);
    expect(cart[0]?.quantity).toBe(3);
    cart = addToCart(cart, product, 2);
    expect(cart[0]?.quantity).toBe(5);
    expect(calculateCartSubtotal(cart)).toBe(product.price * 5);
  });

  it("keeps different product variants separate and merges identical variants", () => {
    const product = storeProducts[2]!;
    const smallBlack = { ...product, variant: { size: "Small", color: "Black" } };
    const largeBlack = { ...product, variant: { size: "Large", color: "Black" } };
    let cart = addToCart([], smallBlack, 1);
    cart = addToCart(cart, largeBlack, 1);
    cart = addToCart(cart, smallBlack, 2);
    expect(cart).toHaveLength(2);
    expect(cart.find((line) => line.product.variant?.size === "Small")?.quantity).toBe(3);
    expect(cart.find((line) => line.product.variant?.size === "Large")?.quantity).toBe(1);
  });

  it("updates quantity and removes a product cleanly before checkout", () => {
    const product = storeProducts[0]!;
    const secondProduct = storeProducts[4]!;
    let cart = addToCart(addToCart([], product), secondProduct, 2);
    cart = updateCartQuantity(cart, product.slug, 2);
    expect(cart.find((line) => line.product.slug === product.slug)?.quantity).toBe(3);
    cart = removeFromCart(cart, secondProduct.slug);
    expect(cart).toHaveLength(1);
    expect(calculateCartSubtotal(cart)).toBe(product.price * 3);
  });
});
