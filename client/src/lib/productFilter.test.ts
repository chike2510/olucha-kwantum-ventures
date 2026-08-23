import { describe, expect, it } from "vitest";
import { filterProducts } from "./productFilter";

const products = [
  { name: "Smart Home Essentials", category: "Electronics", description: "Connected home devices" },
  { name: "Contemporary Unisex Apparel", category: "Fashion", description: "Curated everyday styles" },
  { name: "Premium Dried Ginger", category: "Agro Products", description: "Export-ready produce" },
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
});
