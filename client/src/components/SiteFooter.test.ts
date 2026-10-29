import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { describe, expect, it } from "vitest";
import SiteFooter from "./SiteFooter";

describe("SiteFooter", () => {
  it("removes only the requested Naira and payment footer sentence", () => {
    const markup = renderToStaticMarkup(createElement(Router, { ssrPath: "/" }, createElement(SiteFooter)));
    expect(markup).not.toContain("Prices in Nigerian Naira (₦). Payments processed securely by Paystack.");
    expect(markup).toContain("Secure payments by Paystack.");
    expect(markup).toContain("All rights reserved.");
  });
});
