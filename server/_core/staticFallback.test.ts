import { describe, expect, it } from "vitest";
import { isMissingFileFallback } from "./staticFallback.js";

describe("isMissingFileFallback", () => {
  it("flags the SPA shell served for a missing file", () => {
    expect(isMissingFileFallback("/__manus__/debug-collector.js", "text/html; charset=utf-8")).toBe(true);
    expect(isMissingFileFallback("/assets/missing.css", "text/html")).toBe(true);
  });
  it("leaves page routes and real files alone", () => {
    expect(isMissingFileFallback("/products/premium-dried-ginger", "text/html")).toBe(false);
    expect(isMissingFileFallback("/", "text/html")).toBe(false);
    expect(isMissingFileFallback("/index.html", "text/html")).toBe(false);
    expect(isMissingFileFallback("/robots.txt", "text/plain")).toBe(false);
    expect(isMissingFileFallback("/assets/index.js", "text/javascript")).toBe(false);
  });
});
