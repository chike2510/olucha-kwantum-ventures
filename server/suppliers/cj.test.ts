import { describe, expect, it, vi } from "vitest";
import { createCjClient, CjOrderSubmissionUncertainError } from "./cj.js";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

const productResponse = {
  code: 200,
  result: true,
  data: {
    productNameEn: "CJ Sample Lamp",
    productSku: "CJ-LAMP",
    categoryName: "Lighting",
    description: "<p>A portable <strong>lamp</strong>.</p><script>unsafe()</script>",
    sellPrice: "4.25",
    bigImage: "https://untrusted.example/image.jpg",
    productImageSet: ["https://cf.cjdropshipping.com/lamp.jpg"],
    variants: [{ vid: "variant-1", variantNameEn: "Black", variantSku: "CJ-LAMP-BLK", variantImage: "https://cf.cjdropshipping.com/lamp-black.jpg", variantSellPrice: "4.50" }],
  },
};

const inventoryResponse = {
  code: 200,
  success: true,
  data: {
    variantInventories: [{
      vid: "variant-1",
      inventory: [{ countryCode: "CN", totalInventory: 7 }, { countryCode: "CN", totalInventory: "4" }],
    }],
  },
};

describe("CJ product and stock client", () => {
  it("authenticates and reads only product details and inventory for the mapped variant", async () => {
    const calls: Array<{ url: string; method: string; headers: Headers; body?: string }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, headers: new Headers(init?.headers), body: typeof init?.body === "string" ? init.body : undefined });
      if (url.endsWith("/authentication/getAccessToken")) {
        return jsonResponse({ code: 200, result: true, data: { accessToken: "test-access-token" } });
      }
      if (url.includes("/product/query?")) return jsonResponse(productResponse);
      if (url.includes("/product/stock/getInventoryByPid?")) return jsonResponse(inventoryResponse);
      return jsonResponse({ code: 404, result: false, data: null }, 404);
    };

    const result = await createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 }).syncProduct("product-1", "variant-1");

    expect(result).toMatchObject({
      cjProductName: "CJ Sample Lamp",
      cjVariantName: "Black",
      cjProductSku: "CJ-LAMP",
      cjVariantSku: "CJ-LAMP-BLK",
      cjImageUrl: "https://cf.cjdropshipping.com/lamp.jpg",
      stockQuantity: 11,
    });
    expect(result.stockSyncedAt).toBeInstanceOf(Date);
    expect(calls).toHaveLength(3);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken");
    expect(calls[0]?.body).toBe(JSON.stringify({ apiKey: "test-cj-api-key" }));
    expect(calls[1]?.method).toBe("GET");
    expect(calls[1]?.url).toContain("/product/query?pid=product-1");
    expect(calls[1]?.headers.get("CJ-Access-Token")).toBe("test-access-token");
    expect(calls[2]?.method).toBe("GET");
    expect(calls[2]?.url).toContain("/product/stock/getInventoryByPid?pid=product-1");
    expect(calls.every((call) => !/order|checkout|payment/i.test(new URL(call.url).pathname))).toBe(true);
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("caches the CJ access token for subsequent mapped product syncs", async () => {
    let tokenCalls = 0;
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/authentication/getAccessToken")) {
        tokenCalls += 1;
        return jsonResponse({ code: 200, result: true, data: { accessToken: "cached-token" } });
      }
      if (url.includes("/product/query?")) return jsonResponse(productResponse);
      return jsonResponse(inventoryResponse);
    };
    const client = createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 });

    await client.syncProduct("product-1", "variant-1");
    await client.syncProduct("product-1", "variant-1");

    expect(tokenCalls).toBe(1);
  });

  it("refuses invalid mappings before making network requests", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 });

    await expect(client.syncProduct("", "variant-1")).rejects.toThrow("A valid CJ product and variant mapping is required.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not update stock when the mapped CJ variant is missing", async () => {
    const fetcher: typeof fetch = async (input) => {
      if (String(input).endsWith("/authentication/getAccessToken")) {
        return jsonResponse({ code: 200, result: true, data: { accessToken: "test-access-token" } });
      }
      return jsonResponse(productResponse);
    };
    const client = createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 });

    await expect(client.syncProduct("product-1", "not-the-variant"))
      .rejects.toThrow("The mapped CJ variant was not found. No product or stock data was changed.");
  });
});

describe("CJ catalogue and supplier-order workflow", () => {
  const orderInput = (quantity = 2) => ({
    orderNumber: "OKV-73",
    shipping: {
      customerName: "Test Buyer",
      customerEmail: "buyer@example.com",
      customerPhone: "+2348000000000",
      country: "Nigeria",
      countryCode: "NG",
      address: "1 Example Street",
      address2: "Suite 2",
      city: "Lagos",
      region: "Lagos",
      postalCode: "100001",
    },
    fromCountryCode: "CN",
    logisticName: "CJPacket Ordinary",
    items: [{ productId: "product-1", variantId: "variant-1", variantSku: "CJ-LAMP-BLK", quantity, storeLineItemId: "OKV-73-I8" }],
  });

  it("browses and sanitizes product detail and variants for draft review", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/authentication/getAccessToken")) return jsonResponse({ code: 200, result: true, data: { accessToken: "test-access-token" } });
      if (url.pathname.endsWith("/product/listV2")) return jsonResponse({ code: 200, result: true, data: { totalPages: 2, content: [{ productList: [{ id: "product-1", nameEn: "CJ Sample Lamp", sku: "CJ-LAMP", bigImage: "https://untrusted.example/image.jpg", sellPrice: "4.25" }] }] } });
      if (url.pathname.endsWith("/product/query")) return jsonResponse(productResponse);
      if (url.pathname.endsWith("/product/stock/getInventoryByPid")) return jsonResponse(inventoryResponse);
      return jsonResponse({ code: 404, result: false, data: null }, 404);
    };
    const client = createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 });

    const results = await client.searchCatalogProducts("lamp", 1);
    const detail = await client.getCatalogProduct("product-1");

    expect(results).toMatchObject({ page: 1, totalPages: 2, products: [{ id: "product-1", name: "CJ Sample Lamp", imageUrl: null, supplierPriceUsd: 4.25 }] });
    expect(detail).toMatchObject({
      id: "product-1",
      category: "Lighting",
      description: "A portable lamp.",
      imageUrl: "https://cf.cjdropshipping.com/lamp.jpg",
      variants: [{ id: "variant-1", sku: "CJ-LAMP-BLK", imageUrl: "https://cf.cjdropshipping.com/lamp-black.jpg", stockQuantity: 11 }],
    });
    expect(JSON.stringify(detail)).not.toContain("unsafe()");
  });

  it("submits one unpaid CJ order only after fresh source stock and exact destination logistics checks", async () => {
    const calls: Array<{ path: string; method: string; body?: Record<string, unknown> }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : undefined;
      calls.push({ path: url.pathname, method: init?.method ?? "GET", body });
      if (url.pathname.endsWith("/authentication/getAccessToken")) return jsonResponse({ code: 200, result: true, data: { accessToken: "test-access-token" } });
      if (url.pathname.endsWith("/product/query")) return jsonResponse(productResponse);
      if (url.pathname.endsWith("/product/stock/getInventoryByPid")) return jsonResponse(inventoryResponse);
      if (url.pathname.endsWith("/logistic/getAvailableLogistics")) return jsonResponse({ code: 200, result: true, data: [{ logisticsName: "CJPacket Ordinary" }] });
      if (url.pathname.endsWith("/shopping/order/createOrderV3")) return jsonResponse({ code: 200, result: true, data: { orderId: "cj-order-42", cjOrderCode: "CJ-42", orderStatus: "CREATED" } });
      return jsonResponse({ code: 404, result: false, data: null }, 404);
    };

    const created = await createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 }).createSupplierOrder(orderInput());
    const createCall = calls.find((call) => call.path.endsWith("/shopping/order/createOrderV3"));

    expect(created).toEqual({ orderId: "cj-order-42", orderCode: "CJ-42", orderStatus: "CREATED" });
    expect(calls.filter((call) => call.path.endsWith("/shopping/order/createOrderV3"))).toHaveLength(1);
    expect(createCall?.body).toMatchObject({
      orderNumber: "OKV-73",
      shippingCountryCode: "NG",
      logisticName: "CJPacket Ordinary",
      fromCountryCode: "CN",
      shopLogisticsType: 2,
      payType: 3,
      products: [{ vid: "variant-1", quantity: 2, storeLineItemId: "OKV-73-I8" }],
    });
    expect(calls.some((call) => /payment|payBalance|checkout/i.test(call.path))).toBe(false);
  });

  it("never calls CJ create order when fresh source stock is insufficient", async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (url.pathname.endsWith("/authentication/getAccessToken")) return jsonResponse({ code: 200, result: true, data: { accessToken: "test-access-token" } });
      if (url.pathname.endsWith("/product/query")) return jsonResponse(productResponse);
      if (url.pathname.endsWith("/product/stock/getInventoryByPid")) return jsonResponse(inventoryResponse);
      if (url.pathname.endsWith("/logistic/getAvailableLogistics")) return jsonResponse({ code: 200, result: true, data: [{ logisticsName: "CJPacket Ordinary" }] });
      return jsonResponse({ code: 404, result: false, data: null }, 404);
    };

    await expect(createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 }).createSupplierOrder(orderInput(12)))
      .rejects.toThrow("CJ stock or shipping validation failed; no supplier order was submitted.");
    expect(calls.some((path) => path.endsWith("/shopping/order/createOrderV3"))).toBe(false);
  });

  it("marks create-order transport failures as ambiguous instead of silently retrying", async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/authentication/getAccessToken")) return jsonResponse({ code: 200, result: true, data: { accessToken: "test-access-token" } });
      if (url.pathname.endsWith("/product/query")) return jsonResponse(productResponse);
      if (url.pathname.endsWith("/product/stock/getInventoryByPid")) return jsonResponse(inventoryResponse);
      if (url.pathname.endsWith("/logistic/getAvailableLogistics")) return jsonResponse({ code: 200, result: true, data: [{ logisticsName: "CJPacket Ordinary" }] });
      if (url.pathname.endsWith("/shopping/order/createOrderV3")) return jsonResponse({ code: 500, result: false, data: null }, 500);
      return jsonResponse({ code: 404, result: false, data: null }, 404);
    };

    await expect(createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 }).createSupplierOrder(orderInput()))
      .rejects.toBeInstanceOf(CjOrderSubmissionUncertainError);
  });

  it("reads CJ order and tracking records by their explicit supplier identifiers", async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      calls.push(url.toString());
      if (url.pathname.endsWith("/authentication/getAccessToken")) return jsonResponse({ code: 200, result: true, data: { accessToken: "test-access-token" } });
      if (url.pathname.endsWith("/shopping/order/getOrderDetail")) return jsonResponse({ code: 200, result: true, data: { orderId: "cj-order-42", platformOrderId: "OKV-73", orderNum: "CJ-42", orderStatus: "SHIPPED", trackNumber: "TRACK-123", trackingProvider: "Carrier" } });
      if (url.pathname.endsWith("/logistic/trackInfo")) return jsonResponse({ code: 200, result: true, data: [{ trackingNumber: "TRACK-123", trackingStatus: "In transit", deliveryTime: null, lastMileCarrier: "Carrier" }] });
      return jsonResponse({ code: 404, result: false, data: null }, 404);
    };
    const client = createCjClient("test-cj-api-key", { fetcher, minRequestIntervalMs: 0 });

    await expect(client.getOrderDetail("cj-order-42")).resolves.toMatchObject({ orderId: "cj-order-42", platformOrderId: "OKV-73", trackNumber: "TRACK-123" });
    await expect(client.getTrackingInfo("TRACK-123")).resolves.toMatchObject({ trackingNumber: "TRACK-123", trackingStatus: "In transit", lastMileCarrier: "Carrier" });
    expect(calls.some((call) => call.includes("orderId=cj-order-42"))).toBe(true);
    expect(calls.some((call) => call.includes("trackNumber=TRACK-123"))).toBe(true);
  });
});
