import { describe, expect, it, vi } from "vitest";
import { createCjClient } from "./cj.js";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

const productResponse = {
  code: 200,
  result: true,
  data: {
    productNameEn: "CJ Sample Lamp",
    productSku: "CJ-LAMP",
    bigImage: "https://untrusted.example/image.jpg",
    productImageSet: ["https://cf.cjdropshipping.com/lamp.jpg"],
    variants: [{ vid: "variant-1", variantNameEn: "Black", variantSku: "CJ-LAMP-BLK" }],
  },
};

const inventoryResponse = {
  code: 200,
  success: true,
  data: {
    variantInventories: [{
      vid: "variant-1",
      inventory: [{ totalInventory: 7 }, { totalInventory: "4" }],
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
