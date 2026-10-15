# Olucha Kwantum Ventures — Preview deployment

## Deployment boundaries

The approved preview branch is `cloudflare-preview`. Its Vercel deployment uses the Node.js Lambda/Express API (`api/[...path].ts`) and the Vite output in `dist/public`. Do not merge this work into `main`, change Vercel Production settings, or point it at a production database.

The repository retains a separate Cloudflare Worker entrypoint. `pnpm build` runs the Vite build and a Wrangler **dry run**; it does not publish a Worker or a Vercel deployment. Do not use `pnpm deploy:worker` to deploy this Vercel Preview. A push to `cloudflare-preview` triggers its Vercel Preview deployment.

## Supabase preview database

Use only the isolated Supabase project `olucha-kwantum-preview` (`zmaysbnlgctesemrhkqw`, `eu-west-2`). The app connects directly to PostgreSQL through the Supabase **shared transaction pooler**. The pooler host came from this project's Connect panel; the custom-role username format is `[ROLE].[PROJECT-REF]`.

These variables are configured on Vercel Preview for branch `cloudflare-preview` only:

| Variable | Value or purpose | Handling |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://okv_preview_app.zmaysbnlgctesemrhkqw@aws-0-eu-west-2.pooler.supabase.com:6543/postgres` | Sensitive Preview variable; contains no password or `sslmode` query parameter. |
| `DATABASE_PASSWORD` | Password for the `okv_preview_app` PostgreSQL login | Sensitive Preview secret; keep separate from the URL. |
| `PAYSTACK_SECRET_KEY` | Paystack test secret beginning `sk_test_` | Sensitive Preview secret only; never use a live key or expose it as `VITE_*`. |

The server parses the URL into host, port, role, and database, then passes `DATABASE_PASSWORD` separately to `pg`. This avoids `pg`'s connection-string parsing from overriding the separately supplied password. The pool supplies the Supabase Root 2021 CA and verifies both the certificate chain and hostname. Keep TLS verification enabled. The client pool is limited to one connection per warm serverless instance. Drizzle's node-postgres adapter does not name prepared statements, as required for Supavisor transaction mode.

The server uses a least-privilege database login, not a browser key. RLS is enabled on the eight application tables; `okv_preview_app` has only `SELECT`/`INSERT`/`UPDATE` and sequence usage, with no `DELETE`, superuser, database-creation, role-creation, or RLS-bypass privilege. The Supabase `anon` and `authenticated` roles have no access to application tables. Do not put the database password or any Supabase secret in browser code or frontend build variables.

## Schema and preview products

Drizzle generates PostgreSQL migrations into `supabase/migrations/`. Migration `supabase_preview_postgres_schema` is applied only to project `zmaysbnlgctesemrhkqw`; it creates the app tables, enables RLS, grants app-only access, adds timestamp triggers, and seeds three active, visibly labeled `[PREVIEW TEST]` products. Their descriptions and specifications state that the items are not for fulfillment and checkout is Paystack test mode only. Prices are small test amounts in NGN kobo.

The applied product rows and RLS/grants were verified. The app's real Drizzle lookup for a seeded product also succeeded through the strict-TLS pooler connection. Do not run these migrations against Production, `main`, or any other Supabase project.

## Supabase Auth for the Preview app

Customer sign-in on `cloudflare-preview` uses the isolated Supabase project's email/password Auth provider. The frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the API verifies bearer tokens against Supabase Auth using `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. These values are public and must be scoped to Vercel Preview for `cloudflare-preview` only. Never use a service-role key in browser or app code. The app supports sign-in to an existing account only; it does not register users as part of the checkout test. The server maps a verified Supabase Auth user ID to the app's `users.openId` record and keeps protected checkout procedures authenticated.

## Paystack preview checks

The Preview branch uses only the Paystack test key. Verify checkout against the active preview SKUs, using server-fetched product prices and server-side transaction verification; do not attempt a live payment. Keep callbacks and webhooks on the deployed Preview HTTPS hostname and configure test mode only. Preview test items are not for fulfillment.

Live keys are gated in code: the server accepts an `sk_live_` key only when the Worker variable `PAYSTACK_LIVE_ENABLED` is exactly `true`. With it unset (the default — do not set it on Preview), only `sk_test_` keys and `test`-domain transactions are accepted. In both modes, verification requires the transaction's reference, amount (kobo) and currency to match the stored payment intent, and its domain (`test`/`live`) to match the mode of the configured key.

## Automatic deploys (GitHub Actions)

`.github/workflows/deploy-cloudflare.yml` runs on every push to `cloudflare-preview`: `pnpm install --frozen-lockfile`, `pnpm build`, then `npx wrangler deploy` with `wrangler.jsonc` (Worker + static assets). It needs the repository secret `CLOUDFLARE_API_TOKEN` (a Cloudflare API token with *Workers Scripts: Edit* on the account). The account ID `76f855d8825241bb134fb6c7098a9724` is built into the workflow; a `CLOUDFLARE_ACCOUNT_ID` secret or variable overrides it. Worker secrets (database, Supabase, Paystack, admin) stay in Cloudflare and are not touched by the workflow. The public build values `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are read from repository variables of the same names when set.

## Error responses

Outside `NODE_ENV=development`, tRPC responses never include stack traces, and unexpected server failures return a generic message; details are logged server-side (`wrangler tail`). Express errors return `{ "error": "Internal server error" }`.

## Validation

The local TypeScript check passes, all 37 unit tests pass with disposable test-only admin values, and the Vite/Wrangler dry-run build passes. The generated browser assets were checked and contain no database CA, database password, or database URL. `main` and Vercel Production settings remain unchanged.
