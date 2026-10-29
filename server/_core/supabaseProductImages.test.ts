import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductImageObject, isProductImageObjectKey, uploadProductImageObject } from "./supabaseProductImages.js";

const validKey = "product-images/550e8400-e29b-41d4-a716-446655440000.png";
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const testSecretKey = "sb_secret_unit_test_fixture_only";

describe("private Supabase product-image storage", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://zmaysbnlgctesemrhkqw.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", testSecretKey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("allows only generated product-image UUID paths and supported extensions", () => {
    expect(isProductImageObjectKey(validKey)).toBe(true);
    expect(isProductImageObjectKey("product-images/../../secrets.txt")).toBe(false);
    expect(isProductImageObjectKey("other-bucket/image.png")).toBe(false);
    expect(isProductImageObjectKey("product-images/not-a-uuid.png")).toBe(false);
    expect(isProductImageObjectKey("product-images/550e8400-e29b-41d4-a716-446655440000.svg")).toBe(false);
  });

  it("uploads with the server-side secret key only in the API header and returns a Worker URL", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadProductImageObject(validKey, pngBytes, "image/png");
    expect(result).toEqual({ key: validKey, url: `/manus-storage/${validKey}` });
    expect(JSON.stringify(result)).not.toContain(testSecretKey);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL | string, RequestInit];
    expect(String(url)).toBe(`https://zmaysbnlgctesemrhkqw.supabase.co/storage/v1/object/product-images/${validKey}`);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).apikey).toBe(testSecretKey);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect((init.headers as Record<string, string>)["x-upsert"]).toBe("false");
    expect(init.body).toEqual(pngBytes);
  });

  it("refuses invalid object paths and image bytes before making a Storage request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadProductImageObject("product-images/../../x.png", pngBytes, "image/png")).rejects.toThrow("Invalid product image storage key");
    await expect(uploadProductImageObject(validKey, Buffer.from("not a PNG"), "image/png")).rejects.toThrow("content does not match");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses any Supabase host other than the isolated Preview project", async () => {
    vi.stubEnv("SUPABASE_URL", "https://production-project.supabase.co");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadProductImageObject(validKey, pngBytes, "image/png")).rejects.toThrow("restricted to the Preview project");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads from the private object API and validates the returned image", async () => {
    const fetchMock = vi.fn(async () => new Response(pngBytes, {
      status: 200,
      headers: { "content-type": "image/png", "content-length": String(pngBytes.length) },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProductImageObject(validKey)).resolves.toEqual({ bytes: pngBytes, contentType: "image/png" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL | string, RequestInit];
    expect(String(url)).toBe(`https://zmaysbnlgctesemrhkqw.supabase.co/storage/v1/object/product-images/${validKey}`);
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).apikey).toBe(testSecretKey);
  });

  it("returns null for a missing image without exposing backend details", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    await expect(getProductImageObject(validKey)).resolves.toBeNull();
  });

  it("maps Supabase's HTTP 400 not_found response to a missing object", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      statusCode: "404",
      error: "not_found",
      message: "Object not found",
    }), { status: 400, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProductImageObject(validKey)).resolves.toBeNull();
  });

  it("does not map unrelated HTTP 400 errors to a missing object", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      statusCode: "400",
      error: "invalid_request",
      message: "Invalid request",
    }), { status: 400, headers: { "content-type": "application/json" } })));

    await expect(getProductImageObject(validKey)).rejects.toThrow("Supabase Storage read failed (400)");
  });
});
