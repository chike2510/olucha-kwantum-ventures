import { describe, expect, it } from "vitest";
import { matchesProductImageSignature, parseProductImageDataUrl } from "./_core/productMedia";

const imageFixtures = [
  ["image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])],
  ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 1])],
  ["image/webp", Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1])],
  ["image/gif", Buffer.from("GIF89a\x01", "binary")],
] as const;

function toDataUrl(contentType: string, bytes: Uint8Array) {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("product image upload validation", () => {
  it.each(imageFixtures)("accepts a supported %s image signature", (contentType, bytes) => {
    const result = parseProductImageDataUrl(toDataUrl(contentType, bytes));
    expect(result?.contentType).toBe(contentType);
    expect(result?.bytes).toEqual(Buffer.from(bytes));
  });

  it("rejects unsupported formats, malformed data, and a mismatched image signature", () => {
    expect(parseProductImageDataUrl("data:text/plain;base64,SGVsbG8=")).toBeNull();
    expect(parseProductImageDataUrl("data:image/png;base64,not-base64!")).toBeNull();
    expect(parseProductImageDataUrl("data:image/png;base64,AAAAA")).toBeNull();
    expect(parseProductImageDataUrl(toDataUrl("image/png", Buffer.from("GIF89a")))).toBeNull();
    expect(parseProductImageDataUrl(undefined)).toBeNull();
  });

  it("rejects an image larger than the 8 MiB limit", () => {
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1).toString("base64");
    expect(parseProductImageDataUrl(`data:image/jpeg;base64,${oversized}`)).toBeNull();
  });

  it("only matches the declared image type against its file signature", () => {
    const png = imageFixtures[0][1];
    expect(matchesProductImageSignature("image/png", png)).toBe(true);
    expect(matchesProductImageSignature("image/jpeg", png)).toBe(false);
  });
});
