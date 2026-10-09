type RuntimeBindings = Record<string, unknown>;

const runtimeVariableNames = [
  "VITE_APP_ID",
  "JWT_SECRET",
  "DATABASE_URL",
  "DATABASE_PASSWORD",
  "OAUTH_SERVER_URL",
  "OWNER_OPEN_ID",
  "NODE_ENV",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
  "ADMIN_LOGIN_EMAIL",
  "ADMIN_LOGIN_PASSWORD",
  "PAYSTACK_SECRET_KEY",
] as const;

let workerBindings: Record<string, string> | undefined;

/**
 * Cloudflare Workers provide environment bindings per invocation, not through
 * process.env. Their values are deployment-wide and therefore identical for
 * every request handled by this Worker isolate.
 */
export function setWorkerEnvironment(bindings: RuntimeBindings): void {
  const nextBindings: Record<string, string> = {};
  for (const name of runtimeVariableNames) {
    const value = bindings[name];
    if (typeof value === "string") nextBindings[name] = value;
  }
  workerBindings = nextBindings;
}

export function getRuntimeEnv(name: string): string {
  const boundValue = workerBindings?.[name];
  if (boundValue !== undefined) return boundValue;
  return typeof process !== "undefined" ? process.env[name] ?? "" : "";
}

export const ENV = {
  get appId() {
    return getRuntimeEnv("VITE_APP_ID");
  },
  get cookieSecret() {
    return getRuntimeEnv("JWT_SECRET");
  },
  get databaseUrl() {
    return getRuntimeEnv("DATABASE_URL");
  },
  get databasePassword() {
    return getRuntimeEnv("DATABASE_PASSWORD");
  },
  get oAuthServerUrl() {
    return getRuntimeEnv("OAUTH_SERVER_URL");
  },
  get ownerOpenId() {
    return getRuntimeEnv("OWNER_OPEN_ID");
  },
  get isProduction() {
    return getRuntimeEnv("NODE_ENV") === "production";
  },
  get forgeApiUrl() {
    return getRuntimeEnv("BUILT_IN_FORGE_API_URL");
  },
  get forgeApiKey() {
    return getRuntimeEnv("BUILT_IN_FORGE_API_KEY");
  },
  get adminLoginEmail() {
    return getRuntimeEnv("ADMIN_LOGIN_EMAIL");
  },
  get adminLoginPassword() {
    return getRuntimeEnv("ADMIN_LOGIN_PASSWORD");
  },
  get paystackSecretKey() {
    return getRuntimeEnv("PAYSTACK_SECRET_KEY");
  },
};
