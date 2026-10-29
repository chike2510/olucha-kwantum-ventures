-- Additive Preview workflow schema. This migration changes no existing product or order values.
-- Apply only to the isolated Preview Supabase project after explicit review; never to production.
ALTER TABLE public.cj_product_links
  ADD COLUMN IF NOT EXISTS "cjImportedAt" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "isFixedVariant" boolean;

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS "deliveryCountryCode" varchar(2),
  ADD COLUMN IF NOT EXISTS "deliveryAddress2" text,
  ADD COLUMN IF NOT EXISTS "deliveryCity" varchar(120),
  ADD COLUMN IF NOT EXISTS "deliveryRegion" varchar(120),
  ADD COLUMN IF NOT EXISTS "deliveryPostalCode" varchar(40);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "deliveryCountryCode" varchar(2),
  ADD COLUMN IF NOT EXISTS "deliveryAddress2" text,
  ADD COLUMN IF NOT EXISTS "deliveryCity" varchar(120),
  ADD COLUMN IF NOT EXISTS "deliveryRegion" varchar(120),
  ADD COLUMN IF NOT EXISTS "deliveryPostalCode" varchar(40),
  ADD COLUMN IF NOT EXISTS "verifiedPaymentMode" varchar(8),
  ADD COLUMN IF NOT EXISTS "cjOrderNumber" varchar(64),
  ADD COLUMN IF NOT EXISTS "cjOrderId" varchar(200),
  ADD COLUMN IF NOT EXISTS "cjOrderCode" varchar(200),
  ADD COLUMN IF NOT EXISTS "cjOrderStatus" varchar(40),
  ADD COLUMN IF NOT EXISTS "cjSubmissionStatus" varchar(32),
  ADD COLUMN IF NOT EXISTS "cjSubmissionAttemptedAt" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "cjSubmissionError" text,
  ADD COLUMN IF NOT EXISTS "trackingNumber" varchar(200),
  ADD COLUMN IF NOT EXISTS "trackingStatus" varchar(200),
  ADD COLUMN IF NOT EXISTS "trackingProvider" varchar(200),
  ADD COLUMN IF NOT EXISTS "trackingUrl" text,
  ADD COLUMN IF NOT EXISTS "trackingSyncedAt" timestamp with time zone;

DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT "orders_cjOrderNumber_unique" UNIQUE ("cjOrderNumber");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
