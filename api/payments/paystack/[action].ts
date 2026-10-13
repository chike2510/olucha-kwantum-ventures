import { handlePaystackHttpRequest } from "../../../server/payments/http.js";

// Vercel Function for Paystack callback, cancel and webhook routes.
// The Cloudflare worker routes these in worker.ts; Vercel needs its own entry.
const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};

function publicRequest(request: Request): Request {
  // Behind Vercel's proxy, rebuild the URL from forwarded headers so redirects
  // go back to the public preview hostname.
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) url.host = host;
  url.protocol = "https:";
  return new Request(url.toString(), request);
}

async function handle(request: Request): Promise<Response> {
  const response = await handlePaystackHttpRequest(publicRequest(request));
  if (!response) return new Response("Not found", { status: 404, headers: securityHeaders });
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, headers });
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
