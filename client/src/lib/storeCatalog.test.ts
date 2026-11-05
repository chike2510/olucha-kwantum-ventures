import { describe, expect, it } from "vitest";
import { catalogueToStoreProduct } from "./storeCatalog";

describe("catalogueToStoreProduct", () => {
  it("preserves the exact category so Fashion child labels reach product cards", () => {
    const product = catalogueToStoreProduct({
      id: 1,
      slug: "linen-shirt",
      name: "Men's Linen Shirt",
      category: "Men's Fashion",
      priceKobo: 350000,
      unit: "each",
      description: "Lightweight linen shirt.",
      specifications: null,
      imageUrl: null,
      isActive: 1,
    });

    expect(product.category).toBe("Men's Fashion");
  });
});
