import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("client-ready wording", () => {
  it("does not show deployment setup notes in Admin and CJ controls", () => {
    for (const path of ["Admin.tsx", "admin/AdminProducts.tsx", "admin/CjProductImport.tsx", "admin/CjOrderControls.tsx", "admin/AdminOrders.tsx"]) {
      expect(source(`client/src/pages/${path}`)).not.toMatch(/Preview deployment|server-side|preflight block|operations console|No database catalogue/i);
    }
  });
  it("does not render unfinished business-policy drafting instructions", () => {
    for (const path of ["client/src/pages/info/PolicyPages.tsx", "client/src/pages/info/AboutFaq.tsx", "client/src/lib/siteConfig.ts"]) {
      expect(source(path)).not.toMatch(/\[(?:e\.g\.|Confirm |Optional:|retention period|business hours|return window|refund processing time|date of last review|State whether|State whose)/);
    }
  });
  it("keeps the CJ read-only and no-payment limitations explicit", () => {
    const products = source("client/src/pages/admin/AdminProducts.tsx");
    expect(products).toContain("does not change your retail content or prices, place a supplier order, or pay CJ");
    expect(source("client/src/pages/admin/CjOrderControls.tsx")).toContain("never sends payment to CJ");
  });
  it("keeps failed catalogue checks from being described as a cleared cart", () => {
    expect(source("client/src/pages/Checkout.tsx")).toContain("Your cart is unchanged. Checkout will be available once we confirm");
  });
});
