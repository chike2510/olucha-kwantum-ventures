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

export type CjCatalogProductSummary = {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  supplierPriceUsd: number | null;
  category: string | null;
};

export type CjCatalogSearchResult = {
  page: number;
  totalPages: number;
  products: CjCatalogProductSummary[];
};

export type CjCatalogVariant = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  imageUrl: string | null;
  supplierPriceUsd: number | null;
  stockQuantity: number | null;
};

export type CjCatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string;
  unit: string | null;
  imageUrl: string | null;
  images: string[];
  supplierPriceUsd: number | null;
  variants: CjCatalogVariant[];
};

export type CjSupplierOrderInput = {
  orderNumber: string;
  shipping: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    country: string;
    countryCode: string;
    address: string;
    address2?: string | null;
    city: string;
    region: string;
    postalCode?: string | null;
  };
  fromCountryCode: string;
  logisticName: string;
  items: Array<{
    productId: string;
    variantId: string;
    variantSku: string;
    quantity: number;
    storeLineItemId: string;
  }>;
};

export type CjCreatedOrder = {
  orderId: string;
  orderCode: string | null;
  orderStatus: string | null;
};

export type CjOrderDetail = {
  orderId: string | null;
  orderNum: string | null;
  platformOrderId: string | null;
  cjOrderId: string | null;
  cjOrderCode: string | null;
  orderStatus: string | null;
  trackNumber: string | null;
  trackingProvider: string | null;
  trackingUrl: string | null;
};

export type CjTrackingInfo = {
  trackingNumber: string;
  trackingStatus: string | null;
  deliveryTime: string | null;
  lastMileCarrier: string | null;
  lastTrackNumber: string | null;
};

type CjEnvelope<T> = {
  code?: number;
  result?: boolean;
  success?: boolean;
  data?: T;
};

type CjVariant = {
  vid?: string;
  pid?: string;
  variantNameEn?: string | null;
  variantKey?: string | null;
  variantSku?: string | null;
  variantUnit?: string | null;
  variantImage?: string | null;
  variantSellPrice?: number | string | null;
  inventories?: CjInventoryLocation[] | null;
};

type CjProduct = {
  pid?: string;
  productNameEn?: string | null;
  productName?: string | null;
  productSku?: string | null;
  productUnit?: string | null;
  bigImage?: string | null;
  productImageSet?: string[] | null;
  description?: string | null;
  sellPrice?: number | string | null;
  variants?: CjVariant[] | null;
  categoryName?: string | null;
};

type CjProductSummary = {
  id?: string;
  nameEn?: string | null;
  sku?: string | null;
  spu?: string | null;
  bigImage?: string | null;
  sellPrice?: number | string | null;
  nowPrice?: number | string | null;
  categoryName?: string | null;
  threeCategoryName?: string | null;
};

type CjProductList = {
  pageNumber?: number;
  totalPages?: number;
  content?: Array<{ productList?: CjProductSummary[] | null }> | CjProductSummary[] | null;
};

type CjInventoryLocation = {
  countryCode?: string | null;
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

type CjLogisticOption = { logisticsName?: string | null };

type CjClientOptions = {
  fetcher?: typeof fetch;
  minRequestIntervalMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export class CjOrderPreflightError extends Error {
  constructor(message = "CJ stock or shipping validation failed; no supplier order was submitted.") {
    super(message);
    this.name = "CjOrderPreflightError";
  }
}

export class CjOrderSubmissionUncertainError extends Error {
  constructor() {
    super("CJ submission could not be confirmed. Reconcile the order before retrying.");
    this.name = "CjOrderSubmissionUncertainError";
  }
}

function safeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function safeProductName(product: CjProduct): string {
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
    const host = url.hostname.toLowerCase();
    const allowedHost = host === "cjdropshipping.com" || host.endsWith(".cjdropshipping.com") || host.endsWith(".aliyuncs.com");
    return url.protocol === "https:" && !url.username && !url.password && allowedHost ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function inventoryCount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function priceAmount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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

function validateCountryCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("A valid two-letter country code is required.");
  return code;
}

function descriptionText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim()
    .slice(0, 8000);
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getProductList(data: CjProductList): CjProductSummary[] {
  if (!Array.isArray(data.content)) return [];
  if (data.content.length && data.content.every((entry) => entry && typeof entry === "object" && "productList" in entry)) {
    return (data.content as Array<{ productList?: CjProductSummary[] | null }>).flatMap((entry) => Array.isArray(entry.productList) ? entry.productList : []);
  }
  return data.content as CjProductSummary[];
}

function safeOrderDetail(data: unknown): CjOrderDetail {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("CJ order detail is incomplete.");
  const value = data as Record<string, unknown>;
  return {
    orderId: safeText(value.orderId, 200),
    orderNum: safeText(value.orderNum, 200),
    platformOrderId: safeText(value.platformOrderId, 200),
    cjOrderId: safeText(value.cjOrderId, 200),
    cjOrderCode: safeText(value.cjOrderCode, 200),
    orderStatus: safeText(value.orderStatus, 40),
    trackNumber: safeText(value.trackNumber, 200),
    trackingProvider: safeText(value.trackingProvider, 200),
    trackingUrl: safeHttpsUrl(value.trackingUrl),
  };
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
      throw new Error("CJ could not be reached. No supplier data was changed by this request.");
    }
    if (!response.ok) throw new Error("CJ request failed.");
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("CJ returned an invalid response.");
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

  async function postAuthenticated<T>(path: string, body: unknown): Promise<T> {
    const accessToken = await getAccessToken();
    return requestJson<T>(path, {
      method: "POST",
      headers: { "CJ-Access-Token": accessToken, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function queryProduct(productId: string): Promise<CjProduct> {
    const pid = validateId(productId);
    return getAuthenticated<CjProduct>(`/product/query?${new URLSearchParams({ pid })}`);
  }

  async function queryInventory(productId: string): Promise<CjInventory> {
    const pid = validateId(productId);
    return getAuthenticated<CjInventory>(`/product/stock/getInventoryByPid?${new URLSearchParams({ pid })}`);
  }

  async function queryVariants(product: CjProduct, productId: string): Promise<CjVariant[]> {
    if (Array.isArray(product.variants) && product.variants.some((variant) => safeText(variant.vid, MAX_ID_LENGTH))) {
      return product.variants;
    }
    const data = await getAuthenticated<CjVariant[]>(`/product/variant/query?${new URLSearchParams({ pid: productId })}`);
    if (!Array.isArray(data)) throw new Error("CJ product details do not include variants.");
    return data;
  }

  async function buildPreparedOrder(input: CjSupplierOrderInput) {
    const orderNumber = input.orderNumber.trim();
    if (!/^[A-Za-z0-9-]{1,64}$/.test(orderNumber)) throw new Error("The CJ order reference is invalid.");
    const fromCountryCode = validateCountryCode(input.fromCountryCode);
    const destinationCode = validateCountryCode(input.shipping.countryCode);
    const logisticName = safeText(input.logisticName, 200);
    if (!logisticName) throw new Error("A CJ shipping method must be configured before auto-ordering.");
    if (input.items.length < 1 || input.items.length > 20) throw new Error("The CJ order must contain between 1 and 20 items.");
    if (input.shipping.customerName.trim().length < 2 || input.shipping.customerPhone.trim().length < 7 || input.shipping.city.trim().length < 2 || input.shipping.region.trim().length < 2 || input.shipping.address.trim().length < 8) {
      throw new Error("The delivery address is incomplete.");
    }

    const products: Array<{ vid: string; quantity: number; storeLineItemId: string }> = [];
    for (const item of input.items) {
      const pid = validateId(item.productId);
      const vid = validateId(item.variantId);
      const sku = safeText(item.variantSku, 100);
      const lineItemId = safeText(item.storeLineItemId, 125);
      if (!sku || !lineItemId || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new Error("A mapped CJ order item is invalid.");
      }
      const product = await queryProduct(pid);
      const variants = await queryVariants(product, pid);
      const variant = variants.find((entry) => entry.vid === vid);
      if (!variant || safeText(variant.variantSku, 100) !== sku) throw new Error("A mapped CJ variant changed; no supplier order was submitted.");

      const inventory = await queryInventory(pid);
      if (!Array.isArray(inventory.variantInventories)) throw new Error("CJ inventory could not be confirmed.");
      const variantInventory = inventory.variantInventories.find((entry) => entry.vid === vid);
      if (!variantInventory || !Array.isArray(variantInventory.inventory)) throw new Error("CJ inventory could not be confirmed.");
      const sourceLocations = variantInventory.inventory.filter((location) => location.countryCode?.toUpperCase() === fromCountryCode);
      const counts = sourceLocations.map((location) => inventoryCount(location.totalInventory ?? location.totalInventoryNum));
      if (!counts.length || counts.some((count) => count === null)) throw new Error("CJ stock for the configured shipping-from country could not be confirmed.");
      const available = counts.reduce<number>((total, count) => total + (count ?? 0), 0);
      if (!Number.isSafeInteger(available) || available < item.quantity) throw new Error("Fresh CJ stock is insufficient for this order.");

      const logistics = await postAuthenticated<CjLogisticOption[]>("/logistic/getAvailableLogistics", {
        sku,
        startCountryCode: fromCountryCode,
        destCountryCode: destinationCode,
      });
      if (!Array.isArray(logistics) || !logistics.some((option) => safeText(option.logisticsName, 200) === logisticName)) {
        throw new Error("The configured CJ shipping method is not available for every item and destination.");
      }
      products.push({ vid, quantity: item.quantity, storeLineItemId: lineItemId });
    }

    return {
      orderNumber,
      shippingZip: input.shipping.postalCode?.trim() || "",
      shippingCountry: input.shipping.country.trim().slice(0, 100),
      shippingCountryCode: destinationCode,
      shippingProvince: input.shipping.region.trim().slice(0, 120),
      shippingCity: input.shipping.city.trim().slice(0, 120),
      shippingPhone: input.shipping.customerPhone.trim().slice(0, 50),
      shippingCustomerName: input.shipping.customerName.trim().slice(0, 160),
      shippingAddress: input.shipping.address.trim().slice(0, 500),
      shippingAddress2: input.shipping.address2?.trim().slice(0, 200) ?? "",
      email: input.shipping.customerEmail.trim().slice(0, 320),
      logisticName,
      fromCountryCode,
      shopLogisticsType: 2,
      orderFlow: 1,
      payType: 3,
      products,
    };
  }

  return {
    async searchCatalogProducts(searchTerm: string, page = 1): Promise<CjCatalogSearchResult> {
      const keyWord = searchTerm.trim();
      if (keyWord.length < 2 || keyWord.length > 200) throw new Error("Enter a CJ search term between 2 and 200 characters.");
      if (!Number.isSafeInteger(page) || page < 1 || page > 1000) throw new Error("The CJ catalogue page is invalid.");
      const params = new URLSearchParams({ page: String(page), size: "20", keyWord });
      const data = await getAuthenticated<CjProductList>(`/product/listV2?${params}`);
      const products = getProductList(data).flatMap((product) => {
        const id = safeText(product.id, MAX_ID_LENGTH);
        const name = safeText(product.nameEn, 180);
        if (!id || !name) return [];
        return [{
          id,
          name,
          sku: safeText(product.sku ?? product.spu, 200),
          imageUrl: safeCjImageUrl(product.bigImage),
          supplierPriceUsd: priceAmount(product.sellPrice ?? product.nowPrice),
          category: safeText(product.threeCategoryName ?? product.categoryName, 120),
        }];
      });
      return {
        page,
        totalPages: Number.isSafeInteger(data.totalPages) && (data.totalPages ?? 0) > 0 ? Math.min(data.totalPages ?? 1, 1000) : 1,
        products,
      };
    },

    async getCatalogProduct(productId: string): Promise<CjCatalogProduct> {
      const pid = validateId(productId);
      const product = await queryProduct(pid);
      const variants = await queryVariants(product, pid);
      let inventoryByVariant = new Map<string, CjInventoryLocation[]>();
      try {
        const inventory = await queryInventory(pid);
        if (Array.isArray(inventory.variantInventories)) {
          inventoryByVariant = new Map(inventory.variantInventories.flatMap((entry) => entry.vid ? [[entry.vid, Array.isArray(entry.inventory) ? entry.inventory : []] as const] : []));
        }
      } catch {
        // Inventory is advisory for draft review; a missing/failed read never becomes a positive stock value.
      }
      const images = Array.isArray(product.productImageSet) ? product.productImageSet.map(safeCjImageUrl).filter((image): image is string => Boolean(image)) : [];
      const imageUrl = safeCjImageUrl(product.bigImage) ?? images[0] ?? null;
      return {
        id: pid,
        name: safeProductName(product),
        sku: safeText(product.productSku, 200),
        category: safeText(product.categoryName, 120),
        description: descriptionText(product.description),
        unit: safeText(product.productUnit, 40),
        imageUrl,
        images: Array.from(new Set([...(imageUrl ? [imageUrl] : []), ...images])),
        supplierPriceUsd: priceAmount(product.sellPrice),
        variants: variants.flatMap((variant) => {
          const id = safeText(variant.vid, MAX_ID_LENGTH);
          if (!id) return [];
          const locations = inventoryByVariant.get(id) ?? [];
          const counts = locations.map((location) => inventoryCount(location.totalInventory ?? location.totalInventoryNum));
          const stockQuantity = counts.length && counts.every((count) => count !== null)
            ? counts.reduce<number>((total, count) => total + (count ?? 0), 0)
            : null;
          return [{
            id,
            name: safeText(variant.variantNameEn, 180) ?? safeText(variant.variantKey, 180) ?? safeText(variant.variantSku, 180) ?? id,
            sku: safeText(variant.variantSku, 200),
            unit: safeText(variant.variantUnit, 40) ?? safeText(product.productUnit, 40),
            imageUrl: safeCjImageUrl(variant.variantImage) ?? imageUrl,
            supplierPriceUsd: priceAmount(variant.variantSellPrice),
            stockQuantity,
          }];
        }),
      };
    },

    async syncProduct(productId: string, variantId: string): Promise<CjProductSyncResult> {
      const pid = validateId(productId);
      const vid = validateId(variantId);
      const product = await queryProduct(pid);
      const variants = await queryVariants(product, pid);
      const variant = variants.find((entry) => entry.vid === vid);
      if (!variant) throw new Error("The mapped CJ variant was not found. No product or stock data was changed.");

      const inventory = await queryInventory(pid);
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
        cjProductName: safeProductName(product),
        cjVariantName: safeText(variant.variantNameEn, 180) ?? safeText(variant.variantKey, 180) ?? safeText(variant.variantSku, 180) ?? vid,
        cjProductSku: safeText(product.productSku, 200),
        cjVariantSku: safeText(variant.variantSku, 200),
        cjImageUrl: safeCjImageUrl(product.bigImage) ?? (Array.isArray(product.productImageSet)
          ? product.productImageSet.map((image) => safeCjImageUrl(image)).find(Boolean) ?? null
          : null),
        stockQuantity,
        stockSyncedAt: new Date(now()),
      };
    },

    async createSupplierOrder(input: CjSupplierOrderInput): Promise<CjCreatedOrder> {
      let payload: Awaited<ReturnType<typeof buildPreparedOrder>>;
      try {
        payload = await buildPreparedOrder(input);
      } catch {
        throw new CjOrderPreflightError();
      }
      try {
        const data = await postAuthenticated<unknown>("/shopping/order/createOrderV3", payload);
        const record = Array.isArray(data) ? data[0] : data;
        if (!record || typeof record !== "object") throw new Error("Missing CJ order data.");
        const value = record as Record<string, unknown>;
        const orderId = safeText(value.orderId ?? value.cjOrderId ?? value.id, 200);
        if (!orderId) throw new Error("Missing CJ order identifier.");
        return {
          orderId,
          orderCode: safeText(value.cjOrderCode ?? value.orderNum ?? value.orderCode, 200),
          orderStatus: safeText(value.orderStatus, 40),
        };
      } catch {
        throw new CjOrderSubmissionUncertainError();
      }
    },

    async getOrderDetail(orderId: string): Promise<CjOrderDetail> {
      const id = validateId(orderId);
      const data = await getAuthenticated<unknown>(`/shopping/order/getOrderDetail?${new URLSearchParams({ orderId: id })}`);
      return safeOrderDetail(data);
    },

    async getTrackingInfo(trackNumber: string): Promise<CjTrackingInfo | null> {
      const number = safeText(trackNumber, 200);
      if (!number) throw new Error("A valid CJ tracking number is required.");
      const params = new URLSearchParams({ trackNumber: number });
      const data = await getAuthenticated<unknown>(`/logistic/trackInfo?${params}`);
      if (!Array.isArray(data)) throw new Error("CJ tracking data is incomplete.");
      const match = data.find((entry) => entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).trackingNumber === "string" && ((entry as Record<string, unknown>).trackingNumber as string).trim().toLowerCase() === number.toLowerCase()) as Record<string, unknown> | undefined;
      if (!match) return null;
      return {
        trackingNumber: safeText(match.trackingNumber, 200) ?? number,
        trackingStatus: safeText(match.trackingStatus, 200),
        deliveryTime: safeText(match.deliveryTime, 200),
        lastMileCarrier: safeText(match.lastMileCarrier, 200),
        lastTrackNumber: safeText(match.lastTrackNumber, 200),
      };
    },
  };
}
