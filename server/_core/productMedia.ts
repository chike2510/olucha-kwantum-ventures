const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
const PRODUCT_IMAGE_PATTERN = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

export type ProductImageContentType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export type ProductImagePayload = {
  contentType: ProductImageContentType;
  extension: "png" | "jpg" | "webp" | "gif";
  bytes: Buffer;
};

export function matchesProductImageSignature(contentType: string, bytes: Uint8Array): boolean {
  if (contentType === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/webp") {
    return bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  if (contentType === "image/gif") {
    return bytes.length >= 6 &&
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
      bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
  }
  return false;
}

export function parseProductImageDataUrl(dataUrl: unknown): ProductImagePayload | null {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(PRODUCT_IMAGE_PATTERN);
  if (!match) return null;

  const encoded = match[2];
  const maxEncodedLength = 4 * Math.ceil(MAX_PRODUCT_IMAGE_BYTES / 3);
  if (encoded.length > maxEncodedLength || encoded.length % 4 !== 0) return null;

  const contentType = match[1] as ProductImageContentType;
  const bytes = Buffer.from(encoded, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PRODUCT_IMAGE_BYTES ||
    !matchesProductImageSignature(contentType, bytes)
  ) {
    return null;
  }

  return {
    contentType,
    extension: contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length) as ProductImagePayload["extension"],
    bytes,
  };
}

export const productImageMaxBytes = MAX_PRODUCT_IMAGE_BYTES;
