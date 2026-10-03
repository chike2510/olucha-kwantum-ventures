import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";

const MAX_BODY_CHARACTERS = 10 * 1024 * 1024;
const JSON_CONTENT_TYPE = /^application\/(?:[a-z0-9.+-]*\+)?json$/i;
const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";

function parseUrlEncodedBody(body: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  new URLSearchParams(body).forEach((value, key) => {
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  });
  return result;
}

function workerBodyParser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const contentType = (req.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const isJson = JSON_CONTENT_TYPE.test(contentType);
  const isForm = contentType === FORM_CONTENT_TYPE;
  if (!isJson && !isForm) {
    next();
    return;
  }

  const declaredLength = Number(req.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_CHARACTERS) {
    res.status(413).json({ error: "Request body too large" });
    return;
  }

  let body = "";
  let overLimit = false;
  req.setEncoding("utf8");
  req.on("data", (chunk: string) => {
    if (overLimit) return;
    if (body.length + chunk.length > MAX_BODY_CHARACTERS) {
      overLimit = true;
      return;
    }
    body += chunk;
  });
  req.on("end", () => {
    if (overLimit) {
      res.status(413).json({ error: "Request body too large" });
      return;
    }
    try {
      req.body = isJson ? (body ? JSON.parse(body) : {}) : parseUrlEncodedBody(body);
      next();
    } catch {
      res.status(400).json({ error: "Invalid request body" });
    }
  });
  req.on("error", next);
}

export function createWorkerApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use((req: Request, res: Response, next: NextFunction) => {
    const workerProtocol = req.get("x-worker-request-protocol");
    if (workerProtocol === "http" || workerProtocol === "https") {
      Object.defineProperty(req, "protocol", { configurable: true, value: workerProtocol });
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.use(workerBodyParser);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}
