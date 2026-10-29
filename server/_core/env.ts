type RuntimeBindings = Record<string, unknown>;

const runtimeVariableNames = [
  "VITE_APP_ID",
  "JWT_SECRET",
  "DATABASE_URL",
  "DATABASE_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "OWNER_OPEN_ID",
  "NODE_ENV",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
  "ADMIN_LOGIN_EMAIL",
  "ADMIN_LOGIN_PASSWORD",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_LIVE_ENABLED",
  "CJ_API_KEY",
  "CJ_SYNC_ENABLED",
  "CJ_AUTO_ORDER_ENABLED",
  "CJ_FROM_COUNTRY_CODE",
  "CJ_LOGISTIC_NAME",
  "VERCEL_ENV",
] as const;

let workerBindings: Record<string, string> | undefined;

/** Bindings are deployment-wide and identical for requests in a Worker isolate. */
export function setWorkerEnvironment(bindings: RuntimeBindings): void {
  const nextBindings: Record<string, string> = {};
  for (const name of runtimeVariableNames) {
    const value = bindings[name];
    if (typeof value === "string") nextBindings[name] = value;
  }
  const hyperdrive = bindings.HYPERDRIVE as { connectionString?: unknown } | undefined;
  if (hyperdrive && typeof hyperdrive.connectionString === "string") {
    nextBindings.HYPERDRIVE_CONNECTION_STRING = hyperdrive.connectionString;
  }
  workerBindings = nextBindings;
}

export function getRuntimeEnv(name: string): string {
  const boundValue = workerBindings?.[name];
  if (boundValue !== undefined) return boundValue;
  return typeof process !== "undefined" ? process.env[name] ?? "" : "";
}

export const ENV = {
  get isWorkerRuntime() { return workerBindings !== undefined; },
  get hyperdriveConnectionString() { return workerBindings?.HYPERDRIVE_CONNECTION_STRING ?? ""; },
  get appId() { return getRuntimeEnv("VITE_APP_ID"); },
  get cookieSecret() { return getRuntimeEnv("JWT_SECRET"); },
  get databaseUrl() { return getRuntimeEnv("DATABASE_URL"); },
  get databasePassword() { return getRuntimeEnv("DATABASE_PASSWORD"); },
  get supabaseUrl() { return getRuntimeEnv("SUPABASE_URL"); },
  get supabasePublishableKey() { return getRuntimeEnv("SUPABASE_PUBLISHABLE_KEY"); },
  get supabaseSecretKey() { return getRuntimeEnv("SUPABASE_SECRET_KEY"); },
  get ownerOpenId() { return getRuntimeEnv("OWNER_OPEN_ID"); },
  get isProduction() { return getRuntimeEnv("NODE_ENV") === "production"; },
  get forgeApiUrl() { return getRuntimeEnv("BUILT_IN_FORGE_API_URL"); },
  get forgeApiKey() { return getRuntimeEnv("BUILT_IN_FORGE_API_KEY"); },
  get adminLoginEmail() { return getRuntimeEnv("ADMIN_LOGIN_EMAIL"); },
  get adminLoginPassword() { return getRuntimeEnv("ADMIN_LOGIN_PASSWORD"); },
  get paystackSecretKey() { return getRuntimeEnv("PAYSTACK_SECRET_KEY"); },
  get cjApiKey() { return getRuntimeEnv("CJ_API_KEY"); },
  get cjSyncEnabled() { return getRuntimeEnv("CJ_SYNC_ENABLED") === "true"; },
  get cjAutoOrderEnabled() { return getRuntimeEnv("CJ_AUTO_ORDER_ENABLED") === "true"; },
  get cjFromCountryCode() { return getRuntimeEnv("CJ_FROM_COUNTRY_CODE").trim().toUpperCase(); },
  get cjLogisticName() { return getRuntimeEnv("CJ_LOGISTIC_NAME").trim(); },
  get vercelEnv() { return getRuntimeEnv("VERCEL_ENV"); },
};
