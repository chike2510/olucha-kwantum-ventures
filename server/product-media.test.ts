import { describe, expect, it } from "vitest";
import { parseProductImageDataUrl } from "./_core/productMedia";

describe("product image upload validation", () => {
  it("accepts supported image data URLs and returns bytes", () => {
    const result = parseProductImageDataUrl("data:image/png;base64,AAEC");
    expect(result?.contentType).toBe("image/png");
    expect(result?.extension).toBe("png");
    expect(result?.bytes.length).toBe(3);
  });

  it("rejects unsupported formats and malformed data", () => {
    expect(parseProductImageDataUrl("data:text/plain;base64,SGVsbG8=")).toBeNull();
    expect(parseProductImageDataUrl("data:image/png;base64,not-base64!")).toBeNull();
    expect(parseProductImageDataUrl(undefined)).toBeNull();
  });

  it("rejects an image larger than the 8 MB limit", () => {
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1).toString("base64");
    expect(parseProductImageDataUrl(`data:image/jpeg;base64,${oversized}`)).toBeNull();
  });
});
