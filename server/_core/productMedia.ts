const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
const PRODUCT_IMAGE_PATTERN = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

export type ProductImagePayload = {
  contentType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  extension: "png" | "jpg" | "webp" | "gif";
  bytes: Buffer;
};

export function parseProductImageDataUrl(dataUrl: unknown): ProductImagePayload | null {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(PRODUCT_IMAGE_PATTERN);
  if (!match) return null;
  const contentType = match[1] as ProductImagePayload["contentType"];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_PRODUCT_IMAGE_BYTES) return null;
  return {
    contentType,
    extension: contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length) as ProductImagePayload["extension"],
    bytes,
  };
}

export const productImageMaxBytes = MAX_PRODUCT_IMAGE_BYTES;
