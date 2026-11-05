import { describe, expect, it } from "vitest";
import { filterProducts } from "./productFilter";

const products = [
  { name: "Smart Home Essentials", category: "Electronics", description: "Connected home devices" },
  { name: "Contemporary Unisex Apparel", category: "Fashion", description: "Curated everyday styles" },
  { name: "Premium Dried Ginger", category: "Agro Products", description: "Export-ready produce" },
];
const fashionProducts = [
  products[1],
  { name: "Men's Linen Shirt", category: "Men's Fashion", description: "Lightweight cotton linen" },
  { name: "Women's Occasion Dress", category: "Women's Fashion", description: "Formal evening wear" },
  { name: "Children's School Shoes", category: "Children's Fashion", description: "Durable uniform shoes" },
];

describe("filterProducts", () => {
  it("returns all products for the default category and blank search", () => {
    expect(filterProducts(products, "All products", "  ")).toHaveLength(3);
  });

  it("filters by category and case-insensitive search together", () => {
    expect(filterProducts(products, "Electronics", "  HOME ")).toEqual([products[0]]);
    expect(filterProducts(products, "Fashion", "ginger")).toEqual([]);
  });

  it("searches across category and description", () => {
    expect(filterProducts(products, "All products", "export")).toEqual([products[2]]);
    expect(filterProducts(products, "All products", "fashion")).toEqual([products[1]]);
  });

  it("includes legacy Fashion products and all three subcategories in the Fashion collection", () => {
    expect(filterProducts(fashionProducts, "Fashion", "")).toEqual(fashionProducts);
  });

  it("filters each Fashion subcategory independently", () => {
    expect(filterProducts(fashionProducts, "Men's Fashion", "")).toEqual([fashionProducts[1]]);
    expect(filterProducts(fashionProducts, "Women's Fashion", "dress")).toEqual([fashionProducts[2]]);
    expect(filterProducts(fashionProducts, "Children's Fashion", "shoes")).toEqual([fashionProducts[3]]);
  });
});
