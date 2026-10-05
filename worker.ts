import { httpServerHandler } from "cloudflare:node";
import { createWorkerApp } from "./server/_core/workerApp.js";
import { setWorkerEnvironment } from "./server/_core/env.js";
import { handlePaystackHttpRequest } from "./server/payments/http.js";

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface WorkerEnv extends Record<string, unknown> {
  ASSETS: AssetFetcher;
}

const EXPRESS_PORT = 8787;
const apiApp = createWorkerApp();
apiApp.listen(EXPRESS_PORT);
const expressWorker = httpServerHandler({ port: EXPRESS_PORT });

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function isApiRequest(pathname: string): boolean {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/manus-storage" ||
    pathname.startsWith("/manus-storage/")
  );
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: unknown): Promise<Response> {
    setWorkerEnvironment(env);
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith("/api/payments/paystack/")) {
      const paymentResponse = await handlePaystackHttpRequest(request);
      if (paymentResponse) {
        const headers = new Headers(paymentResponse.headers);
        for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
        headers.set("Cache-Control", "no-store");
        return new Response(paymentResponse.body, {
          status: paymentResponse.status,
          statusText: paymentResponse.statusText,
          headers,
        });
      }
    }

    if (isApiRequest(pathname)) {
      const headers = new Headers(request.headers);
      headers.set("x-worker-request-protocol", new URL(request.url).protocol.slice(0, -1));
      headers.set("x-worker-request-origin", new URL(request.url).origin);
      return expressWorker.fetch(new Request(request, { headers }), env, ctx);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    for (const [name, value] of Object.entries(securityHeaders)) {
      headers.set(name, value);
    }
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
};
