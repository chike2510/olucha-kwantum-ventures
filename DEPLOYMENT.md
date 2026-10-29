# Olucha Kwantum Ventures — Cloudflare test deployment

## Approved target and boundaries

The owner has approved the existing, unlaunched Cloudflare Worker `olucha-kwantum-ventures` as the test/Preview target, despite its Cloudflare environment label being Production. Its public URL is `https://olucha-kwantum-ventures.onovochikeziri84.workers.dev`. Do not create a second Worker, modify `main`, touch a production database, enable live Paystack, create CJ supplier orders, or make supplier payments.

The working branch is `work/cjdropshipping-preview`, based on the current `cloudflare-preview` source. Keep changes uncommitted/unpushed until the combined catalogue, Admin-image, footer and CJ work is validated. A push to `cloudflare-preview` can trigger `.github/workflows/deploy-cloudflare.yml` and publish the Worker; do not push as a substitute for review or while deployment is paused.

`pnpm build` performs a Vite build and Wrangler **dry run** only. It does not publish. Rebuild `dist/public` after all source changes; never deploy stale generated assets.

## Preview database and Hyperdrive

Use only isolated Supabase project `zmaysbnlgctesemrhkqw` (`olucha-kwantum-preview`, eu-west-2). The existing binding is `HYPERDRIVE`, configuration ID `a6efd5bff1a2435a87e3f7740968de7d`, named `okv-preview-db`. Its origin is the Supabase shared pooler on port 5432, database `postgres`, with the dedicated Preview application role. Keep this exact binding in `wrangler.jsonc`; never substitute another resource.

Workers use the Hyperdrive-provided connection string. Node/Vercel development retains its separate strict-TLS PostgreSQL path using `DATABASE_URL` and `DATABASE_PASSWORD`. Keep passwords and connection credentials server-side. The app role is least-privilege; public/anon/authenticated roles must not gain direct access to application tables.

The CJ migration is `supabase/migrations/0001_cj_preview_manual_handoff.sql`. It adds RLS-protected `cj_product_links` and `orders.verifiedPaymentAt`. The coordinator reported that it has been applied only to the isolated Preview project. Do not reapply blindly or run it against another database. Verify schema/grants read-only before a future deployment.

## Runtime values for this test target

| Name | Required handling |
| --- | --- |
| `VERCEL_ENV` | Exact value `preview`; retained as the server's existing CJ environment guard even on Cloudflare. |
| `CJ_SYNC_ENABLED` | Exact value `true` only on this approved test target when ready to test. |
| `CJ_API_KEY` | Cloudflare server-side secret from the saved CJ credential; never a `VITE_*` variable or client asset. |
| `PAYSTACK_SECRET_KEY` | Saved `sk_test_` key only. Never use a live key. |
| `PAYSTACK_LIVE_ENABLED` | Unset or exact `false`; never `true` on this target. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Approved Preview Auth project only; the API verifies bearer tokens. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Public browser Auth values only; never service-role/database credentials. |
| JWT/admin/storage secrets | Preserve existing server-side values and unrelated settings. |

No Cloudflare runtime values have been changed as part of local source reconciliation. Confirm them before publishing; do not assume a local declaration proves a remote secret exists.

## Catalogue and Admin behavior

The storefront must display only active backend products created through Admin, with explicit loading, error and empty states. Never fall back to hard-coded/demo products, including on direct product URLs or persisted-cart recovery. Keep legitimate orders, inquiries and contact messages; removing demo UI is not authorization to delete records.

The legacy `0000_conscious_darwin.sql` migration inserts three clearly marked Preview test fixtures. Follow-up migration `0002_hide_preview_seed_products.sql` retains those rows (and all order references) but sets only those exact `previewTest` fixtures inactive. It is data-only and idempotent; it deletes no products or customer records. Public News cards/articles likewise come only from published Admin blog posts, with explicit loading, error and empty states rather than sample fallback articles.

The Admin product editor supports name, category, price, unit, image upload or link, description, save/cancel and a draft-only live preview. An accepted 8 MiB image expands to about 10.67 MiB in base64 JSON; the Worker body parser allows a bounded 12 MiB envelope and has a regression test.

Remove only the footer sentence `Prices in Nigerian Naira (₦). Payments processed securely by Paystack.` Other payment copy is unchanged.

## CJ reads and manual review

CJ procedures require admin authentication, `VERCEL_ENV=preview`, `CJ_SYNC_ENABLED=true`, and a server-only key. Calls are restricted to authentication, product details and inventory reads. Supplier mappings/cache are separate from the retail catalogue and must not overwrite retail title, description, price or image or automatically publish supplier products.

Mapped products are blocked from checkout without a successful fresh stock check, after 24 hours, or when requested quantity exceeds stored stock. Unmapped products are unaffected.

A manual handoff is a downloadable JSON review draft only for a paid order with server-recorded Paystack verification timestamp. It does not submit a CJ order or authorize payment. Test orders must never be fulfilled.

## Validation before any future publish

Resolve all merge conflicts, install the matching lockfile, run TypeScript and the complete test suite with disposable test-only admin values, then run the fresh Vite/Wrangler dry run. Confirm both `ASSETS` and the exact `HYPERDRIVE` ID appear. Inspect client assets for secret leakage and verify no demo product fallback or removed footer sentence remains.

After an explicitly authorized publish, smoke-test the public app, empty catalogue behavior, Admin upload, and one authenticated read-only CJ product/stock refresh. A build or dry run is not proof of deployed runtime compatibility. No live payments, supplier orders or supplier payments are permitted.

## Current local verification

The local source passes TypeScript and all 109 tests across 27 files. A fresh Vite/Wrangler dry run lists `ASSETS` and the exact approved `HYPERDRIVE` ID; it did not deploy. The storefront and News pages now show only backend-active products and published Admin posts, with separate loading, error and successful-empty states. Cart snapshots stay hidden until active products are verified. Admin metrics and record lists show loading/unavailable states instead of false zeroes after query failures. The data-only `0002_hide_preview_seed_products.sql` retains and deactivates only the marked legacy fixtures. A prior disconnected local UI check confirmed an empty backend yields no demo product cards and that name/category/price/unit/description update the separate draft-only preview; the draft was cancelled without saving. The Worker database path fails closed if its Hyperdrive binding is missing, and Preview rejects live Paystack keys even if a live-enable flag is accidentally present.

No code has been pushed or deployed from this work. The combined source has not yet been tested as a deployed Cloudflare runtime or with a fresh authenticated CJ sync; those checks remain required after deployment is authorized.
