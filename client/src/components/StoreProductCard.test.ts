import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import StoreProductCard from "./StoreProductCard";
import type { StoreProduct } from "@/lib/storeCatalog";

const product: StoreProduct = {
  id: 19,
  slug: "real-item",
  name: "Real Admin product",
  category: "Fashion",
  price: 25000,
  unit: "per item",
  description: "A description entered by the store administrator.",
  color: "from-[#1f5b9f] via-[#0b1736] to-[#cfa43a]",
  tag: "Available",
  specs: {},
  imageUrl: "/manus-storage/product-images/real-admin-photo.jpg",
};

function renderCard(item = product, spotlight = false) {
  return renderToStaticMarkup(createElement(Router, { ssrPath: "/shop" }, createElement(StoreProductCard, { product: item, spotlight })));
}

describe("storefront product card", () => {
  it("renders the exact store image and product facts with accessible navigation", () => {
    const markup = renderCard();
    expect(markup).toContain('src="/manus-storage/product-images/real-admin-photo.jpg"');
    expect(markup).toContain('aria-label="View Real Admin product"');
    expect(markup).toContain("A description entered by the store administrator.");
    expect(markup).toContain("₦25,000");
    expect(markup).toContain("View item");
    expect(markup).not.toMatch(/\b(?:stars?|ratings?|reviews?)\b|\b\d+\s+left\b/i);
  });

  it("uses a designed no-photo fallback rather than inventing a product render", () => {
    const { imageUrl: _imageUrl, ...withoutImage } = product;
    const markup = renderCard(withoutImage);
    expect(markup).not.toContain("real-admin-photo.jpg");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("Real Admin product");
  });

  it("turns a one-product catalogue into an editorial spotlight using the same facts", () => {
    const markup = renderCard(product, true);
    expect(markup).toContain("sm:grid-cols-[1.05fr_.95fr]");
    expect(markup).toContain("From our collection");
    expect(markup).toContain("Real Admin product");
    expect(markup).toContain("real-admin-photo.jpg");
  });

  it("disables entrance, hover and photo zoom motion for reduced-motion preferences", () => {
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    const reducedMotion = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)", css.indexOf(".store-product-card")));
    expect(reducedMotion).toContain(".store-product-card { animation: none !important; transition: none !important; }");
    expect(reducedMotion).toContain(".store-product-card:hover { transform: none !important; }");
    expect(reducedMotion).toContain(".product-image-button:hover img { transform: none !important; }");
  });
});
