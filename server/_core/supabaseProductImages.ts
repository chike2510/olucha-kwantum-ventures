import { ENV } from "./env.js";
import { matchesProductImageSignature, productImageMaxBytes, type ProductImageContentType } from "./productMedia.js";

const PREVIEW_PROJECT_REF = "zmaysbnlgctesemrhkqw";
const PRODUCT_IMAGE_BUCKET = "product-images";
const PRODUCT_IMAGE_KEY_PATTERN = /^product-images\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp|gif)$/i;
const IMAGE_CONTENT_TYPES: Record<string, ProductImageContentType> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export type StoredProductImage = {
  bytes: Buffer;
  contentType: ProductImageContentType;
};

export function isProductImageObjectKey(key: unknown): key is string {
  return typeof key === "string" && PRODUCT_IMAGE_KEY_PATTERN.test(key);
}

function getStorageConfig() {
  const urlText = ENV.supabaseUrl;
  const secretKey = ENV.supabaseSecretKey;
  if (!urlText || !secretKey) {
    throw new Error("Supabase product-image storage is not configured");
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(urlText);
  } catch {
    throw new Error("Supabase product-image storage URL is invalid");
  }

  const expectedHost = `${PREVIEW_PROJECT_REF}.supabase.co`;
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.hostname !== expectedHost ||
    baseUrl.port !== "" ||
    baseUrl.pathname !== "/" ||
    baseUrl.search !== "" ||
    baseUrl.hash !== ""
  ) {
    throw new Error("Supabase product-image storage is restricted to the Preview project");
  }

  return { baseUrl, secretKey };
}

function getObjectUrl(baseUrl: URL, key: string): URL {
  const objectPath = key.split("/").map(encodeURIComponent).join("/");
  return new URL(`/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${objectPath}`, baseUrl.origin);
}

function getStorageHeaders(secretKey: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: secretKey };
  // New Supabase secret API keys are not JWTs and must be sent in `apikey` only.
  // Legacy service_role JWTs can also be sent as Authorization for compatibility.
  if (secretKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${secretKey}`;
  }
  return headers;
}

function contentTypeForKey(key: string): ProductImageContentType | null {
  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  return IMAGE_CONTENT_TYPES[extension] ?? null;
}

export async function uploadProductImageObject(
  key: string,
  bytes: Uint8Array,
  contentType: ProductImageContentType,
): Promise<{ key: string; url: string }> {
  if (!isProductImageObjectKey(key)) throw new Error("Invalid product image storage key");
  if (bytes.byteLength === 0 || bytes.byteLength > productImageMaxBytes) {
    throw new Error("Product image is outside the allowed size range");
  }
  if (contentTypeForKey(key) !== contentType || !matchesProductImageSignature(contentType, bytes)) {
    throw new Error("Product image content does not match its declared type");
  }

  const { baseUrl, secretKey } = getStorageConfig();
  const response = await fetch(getObjectUrl(baseUrl, key), {
    method: "POST",
    headers: {
      ...getStorageHeaders(secretKey),
      "content-type": contentType,
      "cache-control": "max-age=31536000",
      "x-upsert": "false",
    },
    body: bytes as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`Supabase Storage upload failed (${response.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function getProductImageObject(key: string): Promise<StoredProductImage | null> {
  if (!isProductImageObjectKey(key)) throw new Error("Invalid product image storage key");
  const contentType = contentTypeForKey(key);
  if (!contentType) throw new Error("Unsupported product image type");

  const { baseUrl, secretKey } = getStorageConfig();
  const response = await fetch(getObjectUrl(baseUrl, key), {
    method: "GET",
    headers: getStorageHeaders(secretKey),
  });

  if (response.status === 404) return null;
  if (response.status === 400) {
    const errorBody = (await response.json().catch(() => null)) as {
      statusCode?: unknown;
      error?: unknown;
      message?: unknown;
    } | null;
    if (
      (errorBody?.statusCode === "404" || errorBody?.statusCode === 404) &&
      errorBody.error === "not_found" &&
      errorBody.message === "Object not found"
    ) {
      return null;
    }
  }
  if (!response.ok) throw new Error(`Supabase Storage read failed (${response.status})`);

  const responseType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (responseType && responseType !== contentType) {
    throw new Error("Stored product image content type does not match its key");
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength && Number.isFinite(Number(declaredLength)) && Number(declaredLength) > productImageMaxBytes) {
    throw new Error("Stored product image exceeds the allowed size");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > productImageMaxBytes ||
    !matchesProductImageSignature(contentType, bytes)
  ) {
    throw new Error("Stored product image failed validation");
  }

  return { bytes, contentType };
}
