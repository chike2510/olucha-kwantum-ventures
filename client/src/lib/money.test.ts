import { describe, expect, it } from "vitest";
import { formatNairaAmount } from "./money";

describe("formatNairaAmount", () => {
  it("formats whole and fractional amounts", () => {
    expect(formatNairaAmount(48500)).toBe("₦48,500");
    expect(formatNairaAmount(10.5)).toBe("₦10.50");
    expect(formatNairaAmount(0)).toBe("₦0");
    expect(formatNairaAmount(Number.NaN)).toBe("₦0");
  });
});
