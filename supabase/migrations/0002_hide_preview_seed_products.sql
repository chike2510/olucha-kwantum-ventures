-- Keep historical preview seed rows for audit/order references, but never publish
-- them automatically. Only the unmistakable legacy preview fixtures are targeted.
-- This is idempotent and does not delete products, orders, or any customer data.
UPDATE public.products
SET "isActive" = 0,
    "updatedAt" = now()
WHERE "slug" IN ('smart-home-essentials', 'premium-dried-ginger', 'contemporary-unisex-apparel')
  AND "specifications" ->> 'previewTest' = 'true'
  AND "description" LIKE 'PREVIEW TEST ONLY — not for fulfillment.%'
  AND "isActive" <> 0;
