import { PassThrough } from "node:stream";
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { workerBodyParser } from "./workerApp.js";

describe("Cloudflare Worker request body parser", () => {
  it("accepts an 8 MiB product image encoded as a JSON data URL", async () => {
    const dataUrl = `data:image/png;base64,${Buffer.alloc(8 * 1024 * 1024).toString("base64")}`;
    const body = JSON.stringify({ dataUrl });
    const request = Object.assign(new PassThrough(), {
      get: (name: string) => name.toLowerCase() === "content-type"
        ? "application/json"
        : name.toLowerCase() === "content-length"
          ? String(Buffer.byteLength(body))
          : undefined,
    }) as PassThrough & { get(name: string): string | undefined; body?: unknown };
    const responseState = {
      statusCode: 200,
      payload: undefined as unknown,
      status(statusCode: number) {
        this.statusCode = statusCode;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };
    const next = vi.fn();
    const ended = new Promise<void>((resolve, reject) => {
      request.once("end", resolve);
      request.once("error", reject);
    });

    workerBodyParser(request as unknown as Request, responseState as unknown as Response, next);
    request.end(body);
    await ended;

    expect(next).toHaveBeenCalledOnce();
    expect(request.body).toEqual({ dataUrl });
    expect(responseState.statusCode).toBe(200);
  });
});
