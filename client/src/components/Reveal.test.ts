import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import Reveal, { observeReveal } from "./Reveal";

function environment(reduced = false) {
  const media = Object.assign(new EventTarget(), { matches: reduced });
  const element = new EventTarget() as HTMLElement;
  let callback: IntersectionObserverCallback;
  const disconnect = vi.fn();
  const observe = vi.fn();
  const Observer = vi.fn(function (cb: IntersectionObserverCallback) {
    callback = cb;
    return { observe, disconnect };
  }) as unknown as typeof IntersectionObserver;
  return {
    element, media, disconnect, observe, Observer,
    options: { media: media as unknown as MediaQueryList, Observer },
    intersect: (visible: boolean) => callback([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver),
  };
}

describe("viewport entrance", () => {
  it("waits for viewport intersection and reveals only once", () => {
    const env = environment();
    const show = vi.fn();
    const cleanup = observeReveal(env.element, show, env.options);
    expect(env.observe).toHaveBeenCalledWith(env.element);
    expect(env.Observer).toHaveBeenCalledWith(expect.any(Function), { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    env.intersect(false);
    expect(show).not.toHaveBeenCalled();
    env.intersect(true);
    env.intersect(true);
    expect(show).toHaveBeenCalledTimes(1);
    expect(env.disconnect).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("shows content immediately and never starts an observer with reduced motion", () => {
    const env = environment(true);
    const show = vi.fn();
    observeReveal(env.element, show, env.options)();
    expect(show).toHaveBeenCalledOnce();
    expect(env.Observer).not.toHaveBeenCalled();
  });

  it("fails open when IntersectionObserver is unavailable", () => {
    const env = environment();
    const show = vi.fn();
    observeReveal(env.element, show, { media: env.options.media })();
    expect(show).toHaveBeenCalledOnce();
  });

  it("reveals pending content when the preference changes to reduced motion", () => {
    const env = environment();
    const show = vi.fn();
    const cleanup = observeReveal(env.element, show, env.options);
    env.media.matches = true;
    env.media.dispatchEvent(new Event("change"));
    expect(show).toHaveBeenCalledOnce();
    expect(env.disconnect).toHaveBeenCalledOnce();
    cleanup();
  });

  it("reveals keyboard-focused content without waiting for scrolling", () => {
    const env = environment();
    const show = vi.fn();
    const cleanup = observeReveal(env.element, show, env.options);
    env.element.dispatchEvent(new Event("focusin"));
    expect(show).toHaveBeenCalledOnce();
    cleanup();
  });

  it("disconnects and removes preference/focus listeners on unmount", () => {
    const env = environment();
    const show = vi.fn();
    const cleanup = observeReveal(env.element, show, env.options);
    cleanup();
    env.element.dispatchEvent(new Event("focusin"));
    env.media.matches = true;
    env.media.dispatchEvent(new Event("change"));
    expect(show).not.toHaveBeenCalled();
    expect(env.disconnect).toHaveBeenCalledOnce();
  });

  it("preserves semantic tags, attributes and content while clamping decorative delay", () => {
    const html = renderToStaticMarkup(createElement(Reveal, { as: "article", delay: 5000, variant: "slide", "aria-label": "Product", children: "Exact product facts" }));
    expect(html).toContain('<article aria-label="Product"');
    expect(html).toContain('data-reveal-state="pending"');
    expect(html).toContain('data-reveal-variant="slide"');
    expect(html).toContain('--reveal-delay:600ms');
    expect(html).toContain('Exact product facts</article>');
  });

  it("does not retain entrance transforms over hover, and keeps reduced-motion content visible", () => {
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    const cardBase = css.match(/\.store-product-card \{([^}]+)\}/)?.[1];
    expect(cardBase).not.toContain("animation");
    expect(css).toContain("var(--reveal-delay, 0ms) backwards");
    expect(css).not.toContain("olucha-card-arrive");
    expect(css).toContain(".motion-reveal:has(:focus-visible)");
    expect(css).not.toContain(".motion-reveal:focus-within");
    expect(css).toContain('.motion-reveal { opacity: 1 !important; transform: none !important; }');
    expect(css).toContain('*, *::before, *::after { animation: none !important; transition: none !important; }');
  });
});
