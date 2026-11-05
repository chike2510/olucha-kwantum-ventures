import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProductSuggestions, type ProductSearchSuggestion } from "./productSuggestions";

const shopSource = readFileSync(new URL("../pages/Shop.tsx", import.meta.url), "utf8");
const products: ProductSearchSuggestion[] = [
  { id: 1, slug: "classic-shirt", name: "Classic Shirt", category: "Men's Fashion", price: 12500 },
  { id: 2, slug: "silk-scarf", name: "Silk Scarf", category: "Fashion Accessories", price: 5400 },
  { id: 3, slug: "sierra-bag", name: "Sierra Bag", category: "Bags & Luggage", price: 21900 },
  { id: 4, slug: "soft-gloves", name: "Soft Gloves", category: "Underwear & Nightwear", price: 7800 },
  { id: 5, slug: "winter-coat", name: "Winter Coat", category: "Men's Fashion", price: 36000 },
];

describe("product type-ahead suggestions", () => {
  it("updates on each keystroke, narrowing S matches to Si matches", () => {
    const matchesForS = getProductSuggestions(products, "S");
    const matchesForSi = getProductSuggestions(products, "Si");

    expect(matchesForS.map((product) => product.name)).toEqual([
      "Silk Scarf",
      "Sierra Bag",
      "Soft Gloves",
      "Classic Shirt",
    ]);
    expect(matchesForSi.map((product) => product.name)).toEqual([
      "Silk Scarf",
      "Sierra Bag",
      "Classic Shirt",
    ]);
    expect(matchesForSi.every((product) => matchesForS.includes(product))).toBe(true);
    expect(matchesForS[0]).toBe(products[1]);
  });

  it("trims and matches case-insensitively, while returning no invented results", () => {
    expect(getProductSuggestions(products, "  sI ")).toEqual([
      products[1],
      products[2],
      products[0],
    ]);
    expect(getProductSuggestions(products, "not-in-catalogue")).toEqual([]);
    expect(getProductSuggestions(products, "")).toEqual([]);
  });

  it("limits the list without mutating the active catalogue input", () => {
    const original = [...products];
    expect(getProductSuggestions(products, "S", 2)).toEqual([products[1], products[2]]);
    expect(products).toEqual(original);
  });

  it("is wired to the active public catalogue rather than a hard-coded suggestion list", () => {
    expect(shopSource).toMatch(/\.filter\(\(product\) => Boolean\(product\.isActive\)\)/);
    expect(shopSource).toContain("getProductSuggestions(sourceProducts, query)");
  });
});
