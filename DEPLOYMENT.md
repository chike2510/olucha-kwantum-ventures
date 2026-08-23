# Olucha Kwantum Ventures — Vercel Handoff

## Repository and build

The public repository is [chike2510/olucha-kwantum-ventures](https://github.com/chike2510/olucha-kwantum-ventures). Vercel should use the repository root with the framework preset **Vite**, build command `pnpm build`, and output directory `dist/public`. The API functions are exposed under `/api/admin/*` and `/api/trpc/*`; the SPA rewrite in `vercel.json` deliberately excludes `/api/*`.

## Required environment variables

Configure these values in the connected Vercel project for both Preview and Production as appropriate:

| Variable | Purpose |
| --- | --- |
| `ADMIN_LOGIN_EMAIL` | Standalone administrator login email |
| `ADMIN_LOGIN_PASSWORD` | Standalone administrator password |
| `JWT_SECRET` | Long random secret used to sign the HTTP-only admin session cookie |
| `DATABASE_URL` | Database connection supplied by the project environment |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Server-side storage and notification integration |
| `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` | Paystack test-mode payment initialization and verification, when enabled |

Never commit these values to GitHub. The application does not hardcode administrator credentials.

## Admin access

Open `/admin` on the deployed domain. Submit the configured `ADMIN_LOGIN_EMAIL` and `ADMIN_LOGIN_PASSWORD`. A successful login creates an HTTP-only signed session cookie and opens the role-gated operations workspace. The workspace supports product creation with photo upload, order-status updates, export-inquiry status updates, and article creation/editing.

## Final launch checklist

Before enabling real sales, add the Paystack test keys and verify initialization, callback verification, and order persistence on the public domain. Replace the temporary WhatsApp destination and the footer email `hello@oluchakwantum.example` with the business contact details. Enter final product availability, pricing, images, fulfilment rules, and export terms from the admin workspace. Click **Publish** in the project management interface after reviewing the latest checkpoint.
