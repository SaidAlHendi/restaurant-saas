ALTER TABLE "public"."branches" ADD COLUMN "pager_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD COLUMN "pager_number" integer;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_pager_number_range" CHECK ("pager_number" IS NULL OR ("pager_number" >= 1 AND "pager_number" <= 9999));--> statement-breakpoint
INSERT INTO public.plan_features (plan_id, feature_key, limit_value) VALUES
  ('00000000-0000-4000-8000-000000001003', 'ordering.pager', NULL),
  ('00000000-0000-4000-8000-000000001004', 'ordering.pager', NULL)
ON CONFLICT (plan_id, feature_key) DO NOTHING;
