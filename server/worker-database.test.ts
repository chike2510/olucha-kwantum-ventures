import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pool: vi.fn().mockImplementation(() => ({ on: vi.fn() })),
  drizzle: vi.fn().mockImplementation((client: unknown) => ({ $client: client })),
}));
vi.mock("pg", () => ({ Pool: mocks.pool }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: mocks.drizzle }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "postgresql://preview_user@database.invalid/preview");
  vi.stubEnv("DATABASE_PASSWORD", "disposable-test-only-password");
});
afterEach(() => vi.unstubAllEnvs());

describe("Worker database boundary", () => {
  it("does not fall back to a raw URL when a Worker binding is missing", async () => {
    const { setWorkerEnvironment } = await import("./_core/env.js");
    setWorkerEnvironment({});
    const { getDb } = await import("./db.js");
    expect(await getDb()).toBeNull();
    expect(mocks.pool).not.toHaveBeenCalled();
  });

  it("creates fresh app-side pools from the Hyperdrive binding", async () => {
    const connectionString = "postgresql://preview_user:disposable@hyperdrive.invalid/preview";
    const { setWorkerEnvironment } = await import("./_core/env.js");
    setWorkerEnvironment({ HYPERDRIVE: { connectionString } });
    const { getDb } = await import("./db.js");
    await getDb();
    await getDb();
    expect(mocks.pool).toHaveBeenCalledTimes(2);
    expect(mocks.pool).toHaveBeenCalledWith(expect.objectContaining({ connectionString, max: 1 }));
  });

  it("retains the strict-TLS pooled Node path outside Workers", async () => {
    const { getDb } = await import("./db.js");
    const first = await getDb();
    expect(await getDb()).toBe(first);
    expect(mocks.pool).toHaveBeenCalledTimes(1);
    expect(mocks.pool).toHaveBeenCalledWith(expect.objectContaining({
      host: "database.invalid",
      ssl: expect.objectContaining({ rejectUnauthorized: true }),
    }));
  });
});
