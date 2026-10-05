import { ENV } from "../_core/env.js";
import { completePaystackPayment, markPaymentCancelled } from "./checkout.js";
import { verifyPaystackWebhookSignature } from "./paystack.js";

export type PaymentHttpDependencies = {
  getSecretKey: () => string;
  verifySignature: (rawBody: string, signature: string | null, secretKey: string) => Promise<boolean>;
  completePayment: (reference: string, secretKey: string) => Promise<
    | { outcome: "success"; orderId: number }
    | { outcome: "failed" | "pending" | "unknown" }
  >;
  markCancelled: (reference: string) => Promise<void>;
};

function redirectToCheckout(requestUrl: string, payment: string, orderId?: number): Response {
  const target = new URL("/checkout", requestUrl);
  target.searchParams.set("payment", payment);
  if (orderId !== undefined) target.searchParams.set("order", String(orderId));
  return new Response(null, {
    status: 303,
    headers: { Location: target.toString(), "Cache-Control": "no-store" },
  });
}

function isValidReference(reference: string): boolean {
  return /^[A-Za-z0-9.=\-]{1,120}$/.test(reference);
}

export function createPaystackHttpHandler(dependencies: PaymentHttpDependencies) {
  return async function handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/payments/paystack/cancel") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      const reference = url.searchParams.get("reference") ?? "";
      if (isValidReference(reference)) await dependencies.markCancelled(reference).catch(() => undefined);
      return redirectToCheckout(request.url, "cancelled");
    }

    if (path === "/api/payments/paystack/callback") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      const reference = url.searchParams.get("reference") ?? "";
      if (!isValidReference(reference)) {
        return redirectToCheckout(request.url, url.searchParams.get("status") === "cancelled" ? "cancelled" : "failed");
      }
      const secretKey = dependencies.getSecretKey();
      if (!secretKey.startsWith("sk_test_")) return redirectToCheckout(request.url, "pending");
      try {
        const result = await dependencies.completePayment(reference, secretKey);
        if (result.outcome === "success") return redirectToCheckout(request.url, "success", result.orderId);
        if (result.outcome === "pending") return redirectToCheckout(request.url, "pending");
        if (url.searchParams.get("status") === "cancelled") return redirectToCheckout(request.url, "cancelled");
        return redirectToCheckout(request.url, "failed");
      } catch {
        return redirectToCheckout(request.url, "pending");
      }
    }

    if (path === "/api/payments/paystack/webhook") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      const secretKey = dependencies.getSecretKey();
      if (!secretKey.startsWith("sk_test_")) return new Response("Unavailable", { status: 503 });
      const rawBody = await request.text();
      const validSignature = await dependencies.verifySignature(
        rawBody,
        request.headers.get("x-paystack-signature"),
        secretKey,
      ).catch(() => false);
      if (!validSignature) return new Response("Invalid signature", { status: 401 });

      let event: unknown;
      try {
        event = JSON.parse(rawBody);
      } catch {
        return new Response("Invalid event", { status: 400 });
      }
      if (!event || typeof event !== "object" || (event as { event?: unknown }).event !== "charge.success") {
        return new Response(null, { status: 200 });
      }
      const data = (event as { data?: unknown }).data;
      const reference = data && typeof data === "object" ? (data as { reference?: unknown }).reference : undefined;
      if (typeof reference !== "string" || !isValidReference(reference)) {
        return new Response(null, { status: 200 });
      }
      try {
        await dependencies.completePayment(reference, secretKey);
        return new Response(null, { status: 200 });
      } catch {
        // A non-2xx response asks Paystack to retry transient verification/database failures.
        return new Response("Retry", { status: 503 });
      }
    }

    return null;
  };
}

export const handlePaystackHttpRequest = createPaystackHttpHandler({
  getSecretKey: () => ENV.paystackSecretKey,
  verifySignature: verifyPaystackWebhookSignature,
  completePayment: completePaystackPayment,
  markCancelled: markPaymentCancelled,
});
