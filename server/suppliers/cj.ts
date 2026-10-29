const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const TOKEN_CACHE_SAFETY_MS = 5 * 60 * 1000;
const DEFAULT_TOKEN_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ID_LENGTH = 200;

export type CjProductSyncResult = {
  cjProductName: string;
  cjVariantName: string;
  cjProductSku: string | null;
  cjVariantSku: string | null;
  cjImageUrl: string | null;
  stockQuantity: number;
  stockSyncedAt: Date;
};

type CjEnvelope<T> = {
  code?: number;
  result?: boolean;
  success?: boolean;
  data?: T;
};

type CjVariant = {
  vid?: string;
  variantNameEn?: string | null;
  variantSku?: string | null;
};

type CjProduct = {
  productNameEn?: string | null;
  productName?: string | null;
  productSku?: string | null;
  bigImage?: string | null;
  productImageSet?: string[] | null;
  variants?: CjVariant[] | null;
};

type CjInventoryLocation = {
  totalInventory?: number | string | null;
  totalInventoryNum?: number | string | null;
};

type CjVariantInventory = {
  vid?: string;
  inventory?: CjInventoryLocation[] | null;
};

type CjInventory = {
  variantInventories?: CjVariantInventory[] | null;
};

type CjClientOptions = {
  fetcher?: typeof fetch;
  minRequestIntervalMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

function safeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function selectProductName(product: CjProduct): string {
  const english = safeText(product.productNameEn, 180);
  if (english) return english;
  const raw = safeText(product.productName, 180);
  if (!raw) throw new Error("CJ product details are incomplete.");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const first = parsed.find((entry) => typeof entry === "string" && entry.trim());
      if (typeof first === "string") return first.trim().slice(0, 180);
    }
  } catch {
    // A plain productName is still usable when it is not JSON-encoded.
  }
  return raw;
}

function safeCjImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const allowedHost = url.hostname === "cjdropshipping.com" || url.hostname.endsWith(".cjdropshipping.com");
    return url.protocol === "https:" && allowedHost ? url.toString() : null;
  } catch {
    return null;
  }
}

function inventoryCount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function responseData<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") throw new Error("CJ returned an invalid response.");
  const envelope = payload as CjEnvelope<T>;
  if (envelope.code !== 200 || (envelope.result !== true && envelope.success !== true) || envelope.data === undefined || envelope.data === null) {
    throw new Error("CJ request was not successful.");
  }
  return envelope.data;
}

function validateId(value: string): string {
  const id = value.trim();
  if (!id || id.length > MAX_ID_LENGTH || /[\u0000-\u001f\u007f]/.test(id)) {
    throw new Error("A valid CJ product and variant mapping is required.");
  }
  return id;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createCjClient(apiKey: string, options: CjClientOptions = {}) {
  const key = apiKey.trim();
  if (!key) throw new Error("CJ API key is not configured.");

  const fetcher = options.fetcher ?? fetch;
  const minRequestIntervalMs = Math.max(0, options.minRequestIntervalMs ?? 1_000);
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  let cachedAccessToken = "";
  let cachedTokenExpiresAt = 0;
  let nextRequestAt = 0;
  let requestQueue = Promise.resolve();

  async function waitForRequestSlot(): Promise<void> {
    let releaseQueue!: () => void;
    const previous = requestQueue;
    requestQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
    await previous;
    try {
      const wait = Math.max(0, nextRequestAt - now());
      if (wait > 0) await sleep(wait);
      nextRequestAt = now() + minRequestIntervalMs;
    } finally {
      releaseQueue();
    }
  }

  async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
    await waitForRequestSlot();
    let response: Response;
    try {
      response = await fetcher(`${CJ_API_BASE}${path}`, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new Error("CJ could not be reached. No product or stock data was changed.");
    }
    if (!response.ok) throw new Error("CJ request failed. No product or stock data was changed.");
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("CJ returned an invalid response. No product or stock data was changed.");
    }
    return responseData<T>(payload);
  }

  async function getAccessToken(): Promise<string> {
    if (cachedAccessToken && cachedTokenExpiresAt - TOKEN_CACHE_SAFETY_MS > now()) return cachedAccessToken;
    const data = await requestJson<{ accessToken?: string; accessTokenExpiryDate?: string }>(
      "/authentication/getAccessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ apiKey: key }),
      },
    );
    const token = safeText(data.accessToken, 200);
    if (!token) throw new Error("CJ authentication did not return an access token.");
    const expiry = typeof data.accessTokenExpiryDate === "string" ? Date.parse(data.accessTokenExpiryDate) : NaN;
    cachedAccessToken = token;
    cachedTokenExpiresAt = Number.isFinite(expiry) && expiry > now() ? expiry : now() + DEFAULT_TOKEN_LIFETIME_MS;
    return cachedAccessToken;
  }

  async function getAuthenticated<T>(path: string): Promise<T> {
    const accessToken = await getAccessToken();
    return requestJson<T>(path, {
      method: "GET",
      headers: { "CJ-Access-Token": accessToken, Accept: "application/json" },
    });
  }

  return {
    async syncProduct(productId: string, variantId: string): Promise<CjProductSyncResult> {
      const pid = validateId(productId);
      const vid = validateId(variantId);
      const query = new URLSearchParams({ pid });
      const product = await getAuthenticated<CjProduct>(`/product/query?${query.toString()}`);
      if (!Array.isArray(product.variants)) throw new Error("CJ product details do not include variants.");
      const variant = product.variants.find((entry) => entry.vid === vid);
      if (!variant) throw new Error("The mapped CJ variant was not found. No product or stock data was changed.");

      const inventory = await getAuthenticated<CjInventory>(`/product/stock/getInventoryByPid?${query.toString()}`);
      if (!Array.isArray(inventory.variantInventories)) {
        throw new Error("CJ stock data is incomplete. No product or stock data was changed.");
      }
      const variantInventory = inventory.variantInventories.find((entry) => entry.vid === vid);
      if (!variantInventory) throw new Error("CJ stock data did not include the mapped variant. No product or stock data was changed.");

      const locations = Array.isArray(variantInventory.inventory) ? variantInventory.inventory : [];
      const counts = locations.map((location) => inventoryCount(location.totalInventory ?? location.totalInventoryNum));
      if (counts.some((count) => count === null)) {
        throw new Error("CJ stock data contained an invalid quantity. No product or stock data was changed.");
      }
      const stockQuantity = counts.reduce<number>((total, count) => total + (count ?? 0), 0);
      if (!Number.isSafeInteger(stockQuantity)) throw new Error("CJ stock total is outside the supported range.");

      return {
        cjProductName: selectProductName(product),
        cjVariantName: safeText(variant.variantNameEn, 180) ?? safeText(variant.variantSku, 180) ?? vid,
        cjProductSku: safeText(product.productSku, 200),
        cjVariantSku: safeText(variant.variantSku, 200),
        cjImageUrl: safeCjImageUrl(product.bigImage) ?? (Array.isArray(product.productImageSet)
          ? product.productImageSet.map((image) => safeCjImageUrl(image)).find(Boolean) ?? null
          : null),
        stockQuantity,
        stockSyncedAt: new Date(now()),
      };
    },
  };
}
