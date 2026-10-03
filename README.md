# Olucha Kwantum Ventures

Olucha Kwantum Ventures is a product-led e-commerce and export platform for basic electronics, fashion, and agro products. The current storefront uses the message **“Quality products. Trusted choices.”** and includes a public shopping experience, product browsing, export/contact forms, customer account entry, and a role-gated admin workspace.

## Current project status

This repository contains the current implementation checkpoint. The storefront, Express/tRPC API, OAuth callbacks, storage proxy, admin foundation, and database-backed procedures are ported to a Cloudflare Workers deployment target. Paystack payment initialization and verification are not implemented; the app still requires its deployment credentials, the TiDB connection URL, and OAuth callback allowlisting before a live environment is functional.

## Local development

```bash
pnpm install
pnpm dev
```

For a local Cloudflare Workers preview, build the static app first and then start Wrangler:

```bash
pnpm build
pnpm dev:worker
```

Run the available checks with:

```bash
pnpm check
pnpm test
```

`pnpm build` creates the Vite static output and runs `wrangler deploy --dry-run` to compile/validate the Worker without publishing it. `pnpm deploy:worker` is the explicit deployment command and is not run automatically by the build.

## Environment and deployment

Do not commit `.env` files or secrets. Configure Worker secrets and variables in Cloudflare, and provide `VITE_OAUTH_PORTAL_URL` and `VITE_APP_ID` to the frontend build environment. The exact required bindings, TiDB connection requirements, and OAuth callback URLs are in [DEPLOYMENT.md](./DEPLOYMENT.md).

The project retains `vercel.json` and its existing Vercel adapter for the previous deployment target. Cloudflare Workers uses the separate `worker.ts` entrypoint and `wrangler.jsonc` configuration.

## Security

Never place administrator passwords, session-signing keys, database credentials, OAuth secrets, or Forge credentials in source control or browser build variables. Use encrypted deployment secrets for server-only credentials.
