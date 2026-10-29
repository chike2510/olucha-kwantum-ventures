import type { Express, Request, Response } from "express";
import { ENV } from "./env.js";
import { getProductImageObject, isProductImageObjectKey } from "./supabaseProductImages.js";

const PRODUCT_IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export function registerStorageProxy(app: Express) {
  const handler = async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (key.startsWith("product-images/")) {
      if (!isProductImageObjectKey(key)) {
        res.status(404).send("Product image not found");
        return;
      }

      try {
        const image = await getProductImageObject(key);
        if (!image) {
          res.status(404).send("Product image not found");
          return;
        }
        res.set({
          "Cache-Control": PRODUCT_IMAGE_CACHE_CONTROL,
          "Content-Length": String(image.bytes.byteLength),
          "Content-Disposition": "inline",
          "Content-Type": image.contentType,
          "X-Content-Type-Options": "nosniff",
        });
        res.status(200).send(image.bytes);
      } catch {
        console.error("[StorageProxy] Supabase product image fetch failed");
        res.status(502).send("Product image unavailable");
      }
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  };

  app.get("/manus-storage/*", handler);
  app.get("/api/manus-storage/*", handler);
}
