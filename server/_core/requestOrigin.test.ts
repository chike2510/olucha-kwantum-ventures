import { describe, expect, it } from "vitest";
import { getCheckoutRequestOrigin } from "./requestOrigin.js";

function fakeRequest(headers: Record<string, string>, protocol = "https") {
  return {
    protocol,
    get: (name: string) => headers[name.toLowerCase()],
  };
}

describe("getCheckoutRequestOrigin", () => {
  it("normalizes a proxy URL with a path and query to its origin", () => {
    expect(getCheckoutRequestOrigin(fakeRequest({
      "x-worker-request-origin": "https://preview.example/api/trpc?batch=1",
      host: "preview.example",
    }))).toBe("https://preview.example");
  });

  it("normalizes a trailing slash on a proxy origin", () => {
    expect(getCheckoutRequestOrigin(fakeRequest({
      "x-worker-request-origin": "https://preview.example/",
      host: "preview.example",
    }))).toBe("https://preview.example");
  });

  it("falls back to the adapter protocol and host when the proxy value is invalid", () => {
    expect(getCheckoutRequestOrigin(fakeRequest({
      "x-worker-request-origin": "not-a-url",
      host: "preview.example",
    }))).toBe("https://preview.example");
  });

  it("uses the adapter protocol and host when no proxy origin is supplied", () => {
    expect(getCheckoutRequestOrigin(fakeRequest({ host: "preview.example" }))).toBe("https://preview.example");
  });
});
