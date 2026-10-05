const PAYSTACK_API_BASE = "https://api.paystack.co";
const PAYSTACK_CHECKOUT_HOST = "checkout.paystack.com";

export type PaystackTransactionInitInput = {
  email: string;
  amountKobo: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  cancelActionUrl: string;
};

export type PaystackTransaction = {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  domain: string;
};

export type PaystackInitializeResult = {
  authorizationUrl: string;
  reference: string;
};

export function isPaystackTestKey(secretKey: string): boolean {
  return secretKey.startsWith("sk_test_");
}

function requireTestKey(secretKey: string): void {
  if (!isPaystackTestKey(secretKey)) {
    throw new Error("Paystack test mode is not configured.");
  }
}

function isValidReference(reference: string): boolean {
  return /^[A-Za-z0-9.=\-]{1,120}$/.test(reference);
}

async function readSuccessfulJson(response: Response): Promise<Record<string, unknown>> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Paystack request failed.");
  }
  if (!response.ok || !payload || typeof payload !== "object" || (payload as { status?: unknown }).status !== true) {
    throw new Error("Paystack request failed.");
  }
  return payload as Record<string, unknown>;
}

export async function initializePaystackTransaction(
  secretKey: string,
  input: PaystackTransactionInitInput,
  fetcher: typeof fetch = fetch,
): Promise<PaystackInitializeResult> {
  requireTestKey(secretKey);
  if (!isValidReference(input.reference)) throw new Error("Invalid payment reference.");
  if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo <= 0) throw new Error("Invalid payment amount.");

  const response = await fetcher(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      email: input.email,
      amount: String(input.amountKobo),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: { cancel_action: input.cancelActionUrl },
    }),
  });
  const payload = await readSuccessfulJson(response);
  const data = payload.data;
  if (!data || typeof data !== "object") throw new Error("Paystack request failed.");
  const initialized = data as { authorization_url?: unknown; reference?: unknown };
  if (initialized.reference !== input.reference || typeof initialized.authorization_url !== "string") {
    throw new Error("Paystack request failed.");
  }

  let authorizationUrl: URL;
  try {
    authorizationUrl = new URL(initialized.authorization_url);
  } catch {
    throw new Error("Paystack request failed.");
  }
  if (authorizationUrl.protocol !== "https:" || authorizationUrl.hostname !== PAYSTACK_CHECKOUT_HOST) {
    throw new Error("Paystack request failed.");
  }

  return { authorizationUrl: authorizationUrl.toString(), reference: input.reference };
}

export async function verifyPaystackTransaction(
  secretKey: string,
  reference: string,
  fetcher: typeof fetch = fetch,
): Promise<PaystackTransaction> {
  requireTestKey(secretKey);
  if (!isValidReference(reference)) throw new Error("Invalid payment reference.");

  const response = await fetcher(
    `${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Cache-Control": "no-cache",
      },
    },
  );
  const payload = await readSuccessfulJson(response);
  const data = payload.data;
  if (!data || typeof data !== "object") throw new Error("Paystack request failed.");
  const transaction = data as Partial<PaystackTransaction>;
  if (
    typeof transaction.reference !== "string" ||
    typeof transaction.status !== "string" ||
    !Number.isSafeInteger(transaction.amount) ||
    typeof transaction.currency !== "string" ||
    typeof transaction.domain !== "string"
  ) {
    throw new Error("Paystack request failed.");
  }
  return transaction as PaystackTransaction;
}

export function matchesVerifiedPayment(
  transaction: PaystackTransaction,
  expected: { reference: string; amountKobo: number; currency: string },
): boolean {
  return (
    transaction.domain === "test" &&
    transaction.status === "success" &&
    transaction.reference === expected.reference &&
    transaction.amount === expected.amountKobo &&
    transaction.currency.toUpperCase() === expected.currency.toUpperCase()
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeHexEqual(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]{128}$/i.test(actual)) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ actual.toLowerCase().charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string,
): Promise<boolean> {
  if (!signature || !isPaystackTestKey(secretKey)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return constantTimeHexEqual(toHex(new Uint8Array(signed)), signature);
}
