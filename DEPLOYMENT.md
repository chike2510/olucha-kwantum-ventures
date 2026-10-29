# Olucha Kwantum Ventures — Cloudflare test deployment

## Approved target and boundaries

The owner has approved the existing, unlaunched Cloudflare Worker `olucha-kwantum-ventures` as the test/Preview target, despite its Cloudflare environment label being Production. Its public URL is `https://olucha-kwantum-ventures.onovochikeziri84.workers.dev`. Do not create a second Worker, modify `main`, touch a production database, enable live Paystack, create CJ supplier orders, or make supplier payments.

The working branch is `work/cjdropshipping-preview`, based on the current `cloudflare-preview` source. A push to `cloudflare-preview` can trigger `.github/workflows/deploy-cloudflare.yml` and publish the Worker; do not push as a substitute for review or while deployment is paused.

`pnpm build` performs a Vite build and Wrangler **dry run** only. It does not publish. Rebuild `dist/public` after all source changes; never deploy stale generated assets.

## Preview database and Hyperdrive

Use only isolated Supabase project `zmaysbnlgctesemrhkqw` (`olucha-kwantum-preview`, eu-west-2). The existing binding is `HYPERDRIVE`, configuration ID `a6efd5bff1a2435a87e3f7740968de7d`, named `okv-preview-db`. Its origin is the Supabase shared pooler on port 5432, database `postgres`, with the dedicated Preview application role. Keep this exact binding in `wrangler.jsonc`; never substitute another resource.

Workers use the Hyperdrive-provided connection string. Node/Vercel development retains its separate strict-TLS PostgreSQL path using `DATABASE_URL` and `DATABASE_PASSWORD`. Keep passwords and connection credentials server-side. The app role is least-privilege; public/anon/authenticated roles must not gain direct access to application tables.

The CJ migration is `supabase/migrations/0001_cj_preview_manual_handoff.sql`. The coordinator reported that it has been applied only to the isolated Preview project. Do not reapply blindly or run it against another database. Verify schema/grants read-only before a future deployment.

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

## Latest Preview verification

The current source passes `pnpm check`, all 151 tests across 30 files, and a fresh `pnpm build` Vite/Wrangler dry run. The dry run lists `ASSETS`, `VERCEL_ENV=preview`, `CJ_SYNC_ENABLED=true`, `CJ_AUTO_ORDER_ENABLED=false`, `PAYSTACK_LIVE_ENABLED=false`, and the exact approved `HYPERDRIVE` ID. The Preview Worker settings retain those flags and `keep_vars=true`; no private environment identifiers were found in the generated browser assets.

The upload route now returns an absolute same-origin Worker URL. The CJ client uses Cloudflare Workers-supported manual redirect handling, rejects 3xx responses without following them, and preserves full access tokens up to a 4,096-character limit. The real CJ access token was 625 characters; the previous 200-character truncation was the cause of catalog 401 responses.

The approved Worker `olucha-kwantum-ventures` is deployed at `https://olucha-kwantum-ventures.onovochikeziri84.workers.dev`, version `e2fedf17-f4b6-4d6c-a687-dad3d9c5df3a`. Authenticated Admin verification passed: searching `lamp` returned 20 products across 12 pages; the first product detail returned 12 variants, and its first variant stock read returned 28,061 units. These were read-only supplier catalog/detail/inventory requests.

The authenticated Admin image-upload route returned an absolute URL; reading it back returned a 92,597-byte JPEG matching the input SHA-256. The temporary test object was deleted and verified not found. The original object `product-images/ba105e62-7628-4c0f-9f26-e8bff1b50f77.jpg` remained readable and its SHA-256 was unchanged. No product was saved or imported, no mapping or store record was changed, and no supplier order or payment endpoint was called. No Git push, `main` change, Production database change, or billing action was made.

## Admin deletion and client-ready wording

The Admin-created-product hard-delete failure was caused by the dedicated Preview app role having `SELECT`, `INSERT`, and `UPDATE` but no `DELETE` privilege on `public.products`. Migration `supabase/migrations/0005_admin_product_delete_privilege.sql` adds only that single-table privilege to `okv_preview_app`. It grants nothing to public/anon/authenticated roles and changes no catalogue or order data.

The delete transaction locks the requested product, requires Admin provenance, and hides it instead of deleting it when any order line references it. The hard-delete branch now requires a returned product ID before reporting success. Product images and order history are not deleted by this action. Direct regressions cover both branches, provenance, missing products, database failures, exact target IDs and the narrow migration grant.

Visible wording now describes CJ product links, product options and stock checks without exposing deployment/key setup notes. Read-only supplier information, unchanged retail details/prices, unpublished import drafts, fresh-stock checks, duplicate-order protection and no-payment limitations remain explicit; operational flags and behavior are unchanged. Customer checkout/order language is similarly simplified.

Unconfirmed business hours, return-window/refund-processing timings and policy review date are left empty instead of publishing example values. Pages omit empty optional details or direct customers to contact the store for the applicable terms; no deadline or review date has been invented. The owner should confirm these details before launch.

Local validation for this change: TypeScript passes, all 169 tests across 33 files pass, and a fresh Vite build plus Wrangler dry-run passes with the exact approved Hyperdrive ID and unchanged Preview/payment/supplier-order flags.
