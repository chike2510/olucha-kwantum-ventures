# Olucha Kwantum Ventures — Cloudflare Workers deployment

## Worker and build

The complete app runs as one Cloudflare Worker: `worker.ts` handles the Express/tRPC and OAuth API, while Wrangler serves the Vite build from `dist/public` through the `ASSETS` binding with SPA routing. The Worker uses Cloudflare's supported Express bridge and enables `nodejs_compat`; API and storage-proxy routes are sent through the Worker before asset fallback.

From the repository root:

```sh
pnpm install
pnpm build                 # Vite build plus Wrangler deployment dry-run; does not publish
pnpm dev:worker            # local Worker preview (run pnpm build first)
```

For a deliberate deployment after account setup and review, use `pnpm deploy:worker` or the equivalent `wrangler deploy`. That command is not run as part of this port. The existing `vercel.json` and Vercel adapter remain in the repository; this Worker configuration is a separate deployment target.

## Bindings and secrets

Configure these in the Cloudflare Worker environment (Preview and Production separately as appropriate). Do not put credentials in `wrangler.jsonc`, `.env` files committed to Git, or frontend build variables.

| Binding | Type | Required | Purpose |
| --- | --- | --- | --- |
| `ASSETS` | Wrangler asset binding | Yes, created from `./dist/public` | Serves the React/Vite SPA and client assets. Configured in `wrangler.jsonc`. |
| `DATABASE_URL` | Secret | Yes for persisted app features | TiDB Cloud Serverless URL, in the form `mysql://<username>:<password>@<host>/<database>`. Configure an isolated preview database URL for the Preview Worker; never bind production database credentials to preview. Use a TiDB Cloud Starter or Essential endpoint supported by the HTTP driver, with a public endpoint (private endpoints are not supported by that driver). |
| `PAYSTACK_SECRET_KEY` | Secret | Yes for checkout in the preview Worker only | Paystack test secret beginning with `sk_test_`. Keep it server-side; never use a `VITE_*` variable, place it in source, or configure a live key for this preview flow. |
| `ADMIN_LOGIN_EMAIL` | Secret | Yes for admin login | Administrator login email. |
| `ADMIN_LOGIN_PASSWORD` | Secret | Yes for admin login | Administrator password. |
| `JWT_SECRET` | Secret | Yes for signed admin sessions and app token signing | Long, random secret; keep it stable across requests and environments. |
| `OAUTH_SERVER_URL` | Variable | Yes for OAuth login | Base URL of the OAuth token/user-info service used by the existing server SDK. |
| `VITE_APP_ID` | Variable | Yes for OAuth login | App identifier. Configure it both as a Worker runtime variable and as a frontend build-time variable. |
| `OWNER_OPEN_ID` | Variable | Optional | OAuth user ID that receives the existing owner/admin role behavior. |
| `BUILT_IN_FORGE_API_URL` | Variable | Required for Forge-backed uploads, storage, and notification features | Base URL for the existing Forge integration. |
| `BUILT_IN_FORGE_API_KEY` | Secret | Required for Forge-backed uploads, storage, and notification features | Server-only credential for Forge calls. No value is present in this checkout; do not substitute a browser-visible key. |

The browser build also needs `VITE_OAUTH_PORTAL_URL` and `VITE_APP_ID` set in the Cloudflare build environment; these are public configuration, not secrets. The login UI constructs `${VITE_OAUTH_PORTAL_URL}/app-auth` and sends the app ID and callback URL. `VITE_FRONTEND_FORGE_API_URL` and `VITE_FRONTEND_FORGE_API_KEY` are only needed if the currently unused `MapView` component is enabled; any such browser key is public and must be separately restricted by the upstream provider. Never expose `BUILT_IN_FORGE_API_KEY` as a `VITE_*` variable.

The existing HTML also has optional Umami analytics placeholders, `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID`. Set both at build time to enable that script; otherwise Vite emits warnings and leaves the placeholders in the built page.

Use `wrangler secret put <NAME>` for each secret. Set ordinary values as Worker variables in the Cloudflare dashboard or through a local untracked Wrangler environment file. `VITE_OAUTH_PORTAL_URL` and the build-time copy of `VITE_APP_ID` must be present when the Vite build runs; they are not runtime substitutions into already-built JavaScript.

For the Paystack checkout preview, bind `PAYSTACK_SECRET_KEY` only to the non-production Preview Worker after it exists. The application rejects keys that do not begin with `sk_test_`, and does not need the key in the browser build. Do not point the preview Worker at `olucha-kwantum-prod`; use an isolated preview database and its own `DATABASE_URL`.

## TiDB schema and migrations

The Worker uses Drizzle's `drizzle-orm/tidb-serverless` adapter and `@tidbcloud/serverless`, which connect over HTTP from edge runtimes. Migration `0002_paystack_preview_payments.sql` adds durable payment intents, delivery details, item variants, and a unique Paystack-reference constraint used for idempotent order creation. It is generated locally but has **not** been applied. Apply migrations only to the isolated preview database, after its supported SQL-user path and access are available; do not use production database credentials. For example, from a trusted machine with an untracked preview `DATABASE_URL`, run `pnpm exec drizzle-kit migrate`. Do not paste credentials into source files or deployment logs.

## Paystack test checkout endpoints

The initializer accepts only active product rows from the preview `products` table and derives each item price from `priceKobo`; client-supplied prices and browser-only fallback catalogue items are not accepted. Populate the isolated preview catalogue before attempting checkout.

After the non-production Worker has a public HTTPS hostname, set the webhook URL in the **Paystack test-mode** dashboard to:

```text
https://<preview-worker-host>/api/payments/paystack/webhook
```

The Worker validates `x-paystack-signature` against the untouched request body and test secret, following [Paystack's webhook guidance](https://paystack.com/docs/payments/webhooks/). Configure the test webhook on the test integration, not the live integration. Paystack's test-mode delivery retries failed webhook acknowledgements for up to 10 hours; transient verification or database errors receive a retryable `503`.

The server initializes and verifies transactions using [Paystack's Transaction API](https://paystack.com/docs/api/transaction/). It supplies each transaction's callback URL as `https://<preview-worker-host>/api/payments/paystack/callback` and its `metadata.cancel_action` as `/api/payments/paystack/cancel?reference=<reference>`, as described in Paystack's [checkout cancellation guidance](https://paystack.com/docs/guides/using_the_paystack_checkout_in_a_mobile_webview/). The callback always triggers server-side verification; merely visiting it never marks an order paid. The cancellation route only updates checkout status and redirects; it never creates an order. Successful returns and `charge.success` webhooks both go through the same amount, currency, reference, and test-domain checks. The unique order reference and database transaction prevent repeat callback/webhook delivery from creating duplicate orders.

## OAuth callback allowlist

Add the exact deployed callback URL to the OAuth provider's allowed redirect/callback URLs. The required path is `/api/oauth/callback`; the production entry is:

```text
https://<your-worker-domain>/api/oauth/callback
```

If both the default `*.workers.dev` address and a custom domain will be used for sign-in, allowlist both exact URLs:

```text
https://<your-worker-subdomain>.workers.dev/api/oauth/callback
https://<your-custom-domain>/api/oauth/callback
```

Replace the host placeholders with the actual hostname(s) assigned by Cloudflare. `VITE_OAUTH_PORTAL_URL` must point to the matching OAuth portal base URL and `OAUTH_SERVER_URL` to the backend service base URL; confirm these with the existing OAuth provider configuration before enabling login.

## Remaining launch settings

The direct Paystack test-mode code is implemented locally, but checkout cannot be exercised until the separate preview Worker, isolated preview database, and required migration are available. The database setup was not changed here; the Starter console's missing supported SQL Users path remains a blocker for applying the migration. Once preview infrastructure is ready, verify test webhook delivery, cancellation, payment failure, amount mismatch, and repeat webhook delivery. No production database, Cloudflare settings, Vercel settings, or deployed Worker were changed.
