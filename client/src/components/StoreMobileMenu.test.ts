import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StoreMobileMenu from "./StoreMobileMenu";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../pages/Home.tsx", import.meta.url), "utf8");
const shopSource = readFileSync(new URL("../pages/Shop.tsx", import.meta.url), "utf8");
const mobileMenuSource = readFileSync(new URL("./StoreMobileMenu.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

function getMenuMarkup() {
  return renderToStaticMarkup(createElement(StoreMobileMenu, { open: true, onNavigate: () => {} }));
}

function getLinks(markup: string) {
  return Array.from(markup.matchAll(/<a\b([^>]*)>(.*?)<\/a>/g));
}

function decodeHtml(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", '"');
}

const categoryLinks = [
  ["Electronics", "/shop/Electronics"],
  ["Fashion", "/shop/Fashion"],
  ["Men's Fashion", "/shop/Men's%20Fashion"],
  ["Women's Fashion", "/shop/Women's%20Fashion"],
  ["Children's Fashion", "/shop/Children's%20Fashion"],
  ["Shoes & Footwear", "/shop/Shoes%20%26%20Footwear"],
  ["Bags & Luggage", "/shop/Bags%20%26%20Luggage"],
  ["Watches & Jewellery", "/shop/Watches%20%26%20Jewellery"],
  ["Fashion Accessories", "/shop/Fashion%20Accessories"],
  ["Sportswear", "/shop/Sportswear"],
  ["Traditional Fashion", "/shop/Traditional%20Fashion"],
  ["Underwear & Nightwear", "/shop/Underwear%20%26%20Nightwear"],
  ["Agro Products", "/shop/Agro%20Products"],
] as const;

describe("StoreMobileMenu", () => {
  it("shows an accessible, decorative icon before every category label with a 48px tap target", () => {
    const markup = getMenuMarkup();
    const links = getLinks(markup);

    for (const [label, href] of categoryLinks) {
      const link = links.find(([, attributes]) => decodeHtml(attributes).includes(`href="${href}"`));
      expect(link, `${label} link`).toBeDefined();
      expect(link?.[1]).toContain("min-h-12");
      const inner = link?.[2] ?? "";
      const rendered = decodeHtml(inner);
      expect(inner).toContain('aria-hidden="true"');
      expect(rendered).not.toContain("—");
      if (["Men's Fashion", "Women's Fashion", "Children's Fashion", "Shoes & Footwear", "Bags & Luggage", "Watches & Jewellery", "Fashion Accessories", "Sportswear", "Traditional Fashion", "Underwear & Nightwear"].includes(label)) {
        expect(link?.[1]).toContain("pl-8");
      } else {
        expect(link?.[1]).not.toContain("pl-8");
      }
      expect(rendered.indexOf("<svg")).toBeLessThan(rendered.indexOf(label));
    }
  });

  it("uses distinct Mars and Venus icons for men's and women's categories", () => {
    expect(mobileMenuSource).toMatch(/const MarsSymbol: LucideIcon = forwardRef/);
    expect(mobileMenuSource).toMatch(/const VenusSymbol: LucideIcon = forwardRef/);
    expect(mobileMenuSource).toMatch(/"Men's Fashion": MarsSymbol/);
    expect(mobileMenuSource).toMatch(/"Women's Fashion": VenusSymbol/);
  });

  it("keeps My account on the customer route and leaves other utility links unadorned", () => {
    const markup = getMenuMarkup();
    const links = getLinks(markup);
    const accountLink = links.find(([, attributes]) => decodeHtml(attributes).includes('href="/account"'));

    expect(accountLink?.[2]).toContain("My account");
    expect(accountLink?.[2]).not.toContain("<svg");
    expect(appSource).toContain('<Route path={"/account"} component={Account} />');
    expect(appSource).toContain('<Route path={"/admin"} component={Admin} />');
    expect(markup).not.toContain('href="/admin"');

    for (const [label, href] of [["About us", "/about"], ["FAQ", "/faq"], ["Contact", "#contact"]]) {
      const link = links.find(([, attributes]) => decodeHtml(attributes).includes(`href="${href}"`));
      expect(link?.[2]).toContain(label);
      expect(link?.[2]).not.toContain("<svg");
    }
  });

  it("shows selected filters clearly and retains reduced-motion and browser-zoom accessibility", () => {
    expect(homeSource).toContain('aria-pressed={category === item}');
    expect(shopSource).toContain('aria-pressed={category === item}');
    expect(homeSource).toContain("okv-filter min-h-12");
    expect(shopSource).toContain("okv-filter min-h-12");
    expect(cssSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(cssSource).toContain("transition: none !important");
    expect(cssSource).toMatch(/\.okv-filter-active\s*\{[^}]*border-color:\s*var\(--okv-gold\)/s);
    expect(htmlSource).not.toMatch(/user-scalable\s*=\s*no/i);
  });
});
