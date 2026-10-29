import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({ uploadProductImageObject: vi.fn() }));

vi.mock("./supabaseProductImages.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./supabaseProductImages.js")>();
  return { ...actual, uploadProductImageObject: storageMocks.uploadProductImageObject };
});

const { registerOAuthRoutes } = await import("./oauth.js");
const { createAdminSession } = await import("./adminAuth.js");

const imageKey = "product-images/550e8400-e29b-41d4-a716-446655440000.png";
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);

describe("Admin product image upload route", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_LOGIN_EMAIL", "admin@example.invalid");
    vi.stubEnv("ADMIN_LOGIN_PASSWORD", "unit-test-only");
    vi.stubEnv("JWT_SECRET", "test-only-session-signing-secret");
    storageMocks.uploadProductImageObject.mockReset().mockResolvedValue({ key: imageKey, url: `/manus-storage/${imageKey}` });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns an absolute same-origin Worker image URL after upload", async () => {
    const app = express();
    app.use(express.json());
    registerOAuthRoutes(app);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}/api/admin/product-image`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `olucha_admin_session=${encodeURIComponent(createAdminSession("admin@example.invalid"))}`,
          "x-worker-request-origin": "https://olucha-kwantum-ventures.onovochikeziri84.workers.dev",
        },
        body: JSON.stringify({ dataUrl: `data:image/png;base64,${pngBytes.toString("base64")}` }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        key: imageKey,
        url: `https://olucha-kwantum-ventures.onovochikeziri84.workers.dev/manus-storage/${imageKey}`,
      });
      expect(storageMocks.uploadProductImageObject).toHaveBeenCalledOnce();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
