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

  it("renders accessible Facebook and WhatsApp icon links with the existing destinations", () => {
    const markup = renderToStaticMarkup(createElement(Router, { ssrPath: "/" }, createElement(SiteFooter)));
    expect(markup).toContain('href="https://www.facebook.com/profile.php?id=100069088231989"');
    expect(markup).toContain('href="https://wa.me/2348137232498"');
    expect(markup).toContain('aria-label="Open Olucha Kwantum Ventures Facebook page"');
    expect(markup).toContain('aria-label="Chat on WhatsApp at 0813 723 2498"');
  });
});
