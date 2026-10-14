import { describe, expect, it } from "vitest";
import { customerSpecs, humanizeSpecKey } from "./productSpecs";

describe("customerSpecs", () => {
  it("hides internal and boolean flags", () => {
    expect(customerSpecs({ PreviewTest: "true", previewTest: true, _sku: "A1", internalNote: "x", featured: "false", material: "Leather" })).toEqual([["Material", "Leather"]]);
  });
  it("hides store-setup values from the live catalogue", () => {
    expect(customerSpecs({ payment: "Paystack test mode only", fulfillment: "disabled", previewTest: "true" })).toEqual([]);
  });
  it("humanises keys", () => {
    expect(humanizeSpecKey("countryOfOrigin")).toBe("Country of origin");
    expect(humanizeSpecKey("pack_size")).toBe("Pack size");
  });
  it("handles empty input", () => {
    expect(customerSpecs(undefined)).toEqual([]);
  });
});
