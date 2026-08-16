# Olucha Kwantum Ventures

Olucha Kwantum Ventures is a product-led e-commerce and export platform for basic electronics, fashion, and agro products. The current storefront uses the message **“Quality products. Trusted choices.”** and includes a public shopping experience, product browsing, export/contact forms, customer account entry, and a role-gated admin workspace.

## Current project status

This repository contains the current implementation checkpoint. The public storefront and admin foundation are available, while Paystack test credentials, full payment verification, complete order persistence, full admin CRUD, blog administration, and owner email notifications still require final implementation and configuration.

## Local development

```bash
pnpm install
pnpm dev
```

Run the available checks with:

```bash
pnpm check
pnpm test
```

## Environment variables

Do not commit `.env` files or secrets. Configure environment variables through Vercel Project Settings or your local environment. The application may require the built-in Manus variables already described in the project template, database connection variables, and later the Paystack test secret when payment initialization is enabled.

## Vercel deployment note

The client is built with Vite and the project is structured around a full-stack Express/tRPC runtime. The frontend can be deployed to Vercel as a Vite application, but the current server runtime is not automatically converted into Vercel Functions. For a complete production deployment, either keep the managed full-stack runtime or add a deliberate Vercel Functions adapter for the Express/tRPC server and database connections. Do not treat a frontend-only Vercel deployment as a live commerce deployment until server procedures, authentication, database access, and Paystack callbacks have been verified.

## Security

Never place Paystack secret keys, database credentials, OAuth secrets, or notification credentials in source control. Use test mode first and configure production credentials only through encrypted deployment settings.
