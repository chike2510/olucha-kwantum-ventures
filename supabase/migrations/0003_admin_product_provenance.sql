-- Track future Admin-created catalogue products without changing existing rows.
-- NULL remains the provenance value for every product that predates this migration.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS "adminCreatedAt" timestamp with time zone;
