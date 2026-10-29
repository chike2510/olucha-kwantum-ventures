import type { Express, Request, Response } from "express";
import { uploadProductImageObject } from "./supabaseProductImages.js";
import { getCheckoutRequestOrigin } from "./requestOrigin.js";
import { getSessionCookieOptions } from "./cookies.js";
import { parseProductImageDataUrl } from "./productMedia.js";
import { ADMIN_SESSION_COOKIE, adminSessionMaxAgeMs, createAdminSession, isAdminCredentialValid, getAdminSessionFromRequest } from "./adminAuth.js";

export function registerOAuthRoutes(app: Express) {
  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || !isAdminCredentialValid(email, password)) {
      res.status(401).json({ error: "Invalid administrator credentials" });
      return;
    }
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(ADMIN_SESSION_COOKIE, createAdminSession(email), { ...cookieOptions, maxAge: adminSessionMaxAgeMs });
    res.json({ authenticated: true });
  });

  app.get("/api/admin/session", (req: Request, res: Response) => {
    const session = getAdminSessionFromRequest(req);
    res.json(session ? { authenticated: true, email: session.email } : { authenticated: false });
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    res.clearCookie(ADMIN_SESSION_COOKIE, getSessionCookieOptions(req));
    res.json({ authenticated: false });
  });

  app.post("/api/admin/product-image", async (req: Request, res: Response) => {
    if (!getAdminSessionFromRequest(req)) {
      res.status(403).json({ error: "Administrator session required" });
      return;
    }
    const image = parseProductImageDataUrl(req.body?.dataUrl);
    if (!image) {
      res.status(415).json({ error: "Only PNG, JPEG, WEBP, or GIF images smaller than 8 MB are accepted" });
      return;
    }
    try {
      const uploaded = await uploadProductImageObject(`product-images/${crypto.randomUUID()}.${image.extension}`, image.bytes, image.contentType);
      const origin = new URL(getCheckoutRequestOrigin(req));
      const imageUrl = new URL(uploaded.url, origin);
      if (imageUrl.origin !== origin.origin) throw new Error("Image URL must remain on the current origin");
      res.json({ ...uploaded, url: imageUrl.toString() });
    } catch {
      console.error("[Storage] Product image upload failed");
      res.status(502).json({ error: "Product image upload failed" });
    }
  });
}
