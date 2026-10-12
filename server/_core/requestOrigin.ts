export type RequestWithOriginHeaders = {
  get?: (name: string) => string | undefined;
  protocol?: string;
};

/**
 * Proxies may supply x-worker-request-origin as a URL rather than a bare origin.
 * Keep only the URL origin; initializePaymentCheckout performs the HTTPS/local
 * origin validation before constructing Paystack callback URLs.
 */
export function getCheckoutRequestOrigin(request: RequestWithOriginHeaders): string {
  const workerOrigin = request.get?.("x-worker-request-origin")?.trim();
  if (workerOrigin) {
    try {
      const parsed = new URL(workerOrigin);
      if (!parsed.username && !parsed.password) return parsed.origin;
    } catch {
      // Fall back to the request adapter's protocol and host below.
    }
  }

  const protocol = request.protocol?.trim() || "https";
  const host = request.get?.("host")?.trim() || "";
  return `${protocol}://${host}`;
}
