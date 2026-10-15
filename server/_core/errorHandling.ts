import type { TRPCError } from "@trpc/server";
import type { ErrorRequestHandler } from "express";
import { getRuntimeEnv } from "./env.js";

export const GENERIC_SERVER_ERROR_MESSAGE = "Something went wrong. Please try again later.";

/** Error details (stack traces, raw internal messages) are only exposed when NODE_ENV is exactly "development". */
export function isDevelopment(): boolean {
  return getRuntimeEnv("NODE_ENV") === "development";
}

/**
 * An INTERNAL_SERVER_ERROR with a `cause` came from an unexpected throw (database, network, bug),
 * so its message may leak internals. Explicitly thrown TRPCErrors carry a message written for users.
 */
export function isUnexpectedTrpcError(error: TRPCError): boolean {
  return error.code === "INTERNAL_SERVER_ERROR" && error.cause !== undefined;
}

type ErrorShape = { message: string; code: number; data: Record<string, unknown> & { stack?: string } };

export function formatTrpcError<TShape extends ErrorShape>(
  { shape, error }: { shape: TShape; error: TRPCError },
  development = isDevelopment(),
): TShape {
  if (development) return shape;
  const { stack: _stack, ...data } = shape.data;
  return {
    ...shape,
    message: isUnexpectedTrpcError(error) ? GENERIC_SERVER_ERROR_MESSAGE : shape.message,
    data,
  };
}

/** tRPC adapter onError hook: log unexpected failures server-side (never sent to the client). */
export function logTrpcError({ error, path }: { error: TRPCError; path?: string }): void {
  if (error.code !== "INTERNAL_SERVER_ERROR") return;
  console.error(`[tRPC] ${path ?? "<unknown>"} failed:`, error.cause ?? error);
}

/** Final Express error handler: logs the error and returns a generic JSON body outside development. */
export const expressErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const rawStatus = Number((err as { status?: unknown; statusCode?: unknown })?.status ?? (err as { statusCode?: unknown })?.statusCode);
  const status = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
  if (status >= 500) console.error(`[HTTP] ${req.method} ${req.originalUrl ?? req.url} failed:`, err);
  const body: Record<string, unknown> = { error: status >= 500 ? "Internal server error" : "Bad request" };
  if (isDevelopment()) {
    body.message = err instanceof Error ? err.message : String(err);
    if (err instanceof Error) body.stack = err.stack;
  }
  res.status(status).json(body);
};
