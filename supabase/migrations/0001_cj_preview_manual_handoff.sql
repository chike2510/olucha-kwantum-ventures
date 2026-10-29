CREATE TABLE "cj_product_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"cjProductId" varchar(200) NOT NULL,
	"cjVariantId" varchar(200) NOT NULL,
	"cjProductSku" varchar(200),
	"cjVariantSku" varchar(200),
	"cjProductName" varchar(180),
	"cjVariantName" varchar(180),
	"cjImageUrl" text,
	"stockQuantity" integer,
	"stockSyncedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cj_product_links_productId_unique" UNIQUE("productId"),
	CONSTRAINT "cj_product_links_cjVariantId_unique" UNIQUE("cjVariantId")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "verifiedPaymentAt" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "cj_product_links" ADD CONSTRAINT "cj_product_links_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE public.cj_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_runtime_access ON public.cj_product_links FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE public.cj_product_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cj_product_links TO okv_preview_app;
REVOKE ALL ON SEQUENCE public.cj_product_links_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.cj_product_links_id_seq TO okv_preview_app;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO okv_preview_app;
CREATE TRIGGER cj_product_links_set_updated_at BEFORE UPDATE ON public.cj_product_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
