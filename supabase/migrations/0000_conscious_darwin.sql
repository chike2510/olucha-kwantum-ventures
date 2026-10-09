CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."export_inquiry_status" AS ENUM('new', 'reviewing', 'quoted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_intent_status" AS ENUM('initializing', 'pending', 'failed', 'cancelled', 'paid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(220) NOT NULL,
	"slug" varchar(240) NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"fullName" varchar(160) NOT NULL,
	"email" varchar(320) NOT NULL,
	"message" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"fullName" varchar(160) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(50),
	"productInterest" varchar(180) NOT NULL,
	"quantity" varchar(120),
	"destinationCountry" varchar(100) NOT NULL,
	"message" text,
	"status" "export_inquiry_status" DEFAULT 'new' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer NOT NULL,
	"productName" varchar(180) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPriceKobo" integer NOT NULL,
	"variant" jsonb
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"customerName" varchar(160) NOT NULL,
	"customerEmail" varchar(320) NOT NULL,
	"customerPhone" varchar(50),
	"deliveryCountry" varchar(100),
	"deliveryAddress" text,
	"totalKobo" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'NGN' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"paystackReference" varchar(120),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_paystackReference_unique" UNIQUE("paystackReference")
);
--> statement-breakpoint
CREATE TABLE "payment_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(120) NOT NULL,
	"userId" integer,
	"customerName" varchar(160) NOT NULL,
	"customerEmail" varchar(320) NOT NULL,
	"customerPhone" varchar(50) NOT NULL,
	"deliveryCountry" varchar(100) NOT NULL,
	"deliveryAddress" text NOT NULL,
	"totalKobo" integer NOT NULL,
	"currency" varchar(8) NOT NULL,
	"lines" jsonb NOT NULL,
	"status" "payment_intent_status" DEFAULT 'initializing' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_intents_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"category" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"specifications" jsonb NOT NULL,
	"priceKobo" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'NGN' NOT NULL,
	"unit" varchar(40) DEFAULT 'per item' NOT NULL,
	"imageUrl" text,
	"isActive" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);

-- Keep public Data API roles away from application rows; the server-only app login is the only runtime role.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE postgres TO okv_preview_app;
GRANT USAGE ON SCHEMA public TO okv_preview_app;
GRANT USAGE ON TYPE public.blog_post_status, public.export_inquiry_status, public.order_status, public.payment_intent_status, public.user_role TO okv_preview_app;

REVOKE ALL ON TABLE public.blog_posts, public.contact_messages, public.export_inquiries, public.order_items, public.orders, public.payment_intents, public.products, public.users FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.blog_posts, public.contact_messages, public.export_inquiries, public.order_items, public.orders, public.payment_intents, public.products, public.users TO okv_preview_app;

REVOKE ALL ON SEQUENCE public.blog_posts_id_seq, public.contact_messages_id_seq, public.export_inquiries_id_seq, public.order_items_id_seq, public.orders_id_seq, public.payment_intents_id_seq, public.products_id_seq, public.users_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.blog_posts_id_seq, public.contact_messages_id_seq, public.export_inquiries_id_seq, public.order_items_id_seq, public.orders_id_seq, public.payment_intents_id_seq, public.products_id_seq, public.users_id_seq TO okv_preview_app;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_runtime_access ON public.blog_posts FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);
CREATE POLICY app_runtime_access ON public.contact_messages FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);
CREATE POLICY app_runtime_access ON public.export_inquiries FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);
CREATE POLICY app_runtime_access ON public.order_items FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);
CREATE POLICY app_runtime_access ON public.orders FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);
CREATE POLICY app_runtime_access ON public.payment_intents FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);
CREATE POLICY app_runtime_access ON public.products FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);
CREATE POLICY app_runtime_access ON public.users FOR ALL TO okv_preview_app USING (true) WITH CHECK (true);

CREATE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO okv_preview_app;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER blog_posts_set_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payment_intents_set_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Every seeded SKU is visibly test-only, active for checkout, and explicitly not for fulfillment.
INSERT INTO public.products ("name", "slug", "category", "description", "specifications", "priceKobo", "currency", "unit", "imageUrl", "isActive") VALUES
  ('[PREVIEW TEST] Smart Home Essentials', 'smart-home-essentials', 'Electronics', 'PREVIEW TEST ONLY — not for fulfillment. Checkout is connected to Paystack test mode only.', '{"previewTest":"true","fulfillment":"disabled","payment":"Paystack test mode only"}'::jsonb, 10000, 'NGN', 'per preview test item', NULL, 1),
  ('[PREVIEW TEST] Dried Ginger Sample', 'premium-dried-ginger', 'Agro Products', 'PREVIEW TEST ONLY — not for fulfillment. Checkout is connected to Paystack test mode only.', '{"previewTest":"true","fulfillment":"disabled","payment":"Paystack test mode only"}'::jsonb, 5000, 'NGN', 'per preview test item', NULL, 1),
  ('[PREVIEW TEST] Apparel Sample', 'contemporary-unisex-apparel', 'Fashion', 'PREVIEW TEST ONLY — not for fulfillment. Checkout is connected to Paystack test mode only.', '{"previewTest":"true","fulfillment":"disabled","payment":"Paystack test mode only"}'::jsonb, 15000, 'NGN', 'per preview test item', NULL, 1)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "description" = EXCLUDED."description",
  "specifications" = EXCLUDED."specifications",
  "priceKobo" = EXCLUDED."priceKobo",
  "currency" = EXCLUDED."currency",
  "unit" = EXCLUDED."unit",
  "imageUrl" = EXCLUDED."imageUrl",
  "isActive" = EXCLUDED."isActive";
