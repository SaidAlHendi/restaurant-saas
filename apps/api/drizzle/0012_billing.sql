CREATE TYPE "public"."plan_interval" AS ENUM('month');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."billing_provider" AS ENUM('paddle');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"price_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"interval" "plan_interval" DEFAULT 'month' NOT NULL,
	"per_branch" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"sort_order" smallint NOT NULL,
	CONSTRAINT "plans_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "plan_features" (
	"plan_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"limit_value" integer,
	CONSTRAINT "plan_features_plan_id_feature_key_pk" PRIMARY KEY("plan_id","feature_key")
);
--> statement-breakpoint
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" NOT NULL,
	"branch_quantity" integer DEFAULT 1 NOT NULL,
	"provider" "billing_provider",
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"trial_ends_at" timestamptz,
	"current_period_end" timestamptz,
	"canceled_at" timestamptz,
	"scheduled_change" jsonb,
	"provider_event_at" timestamptz,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_org_id_unique" UNIQUE("org_id"),
	CONSTRAINT "subscriptions_provider_subscription_id_unique" UNIQUE("provider_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" "billing_provider" DEFAULT 'paddle' NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamptz NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamptz,
	"error" text,
	CONSTRAINT "billing_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
INSERT INTO public.plans (id, key, name, price_minor, currency, interval, per_branch, is_public, sort_order) VALUES
  ('00000000-0000-4000-8000-000000001001', 'free', 'Free', 0, 'USD', 'month', false, true, 1),
  ('00000000-0000-4000-8000-000000001002', 'menu', 'Menu', 1200, 'USD', 'month', false, true, 2),
  ('00000000-0000-4000-8000-000000001003', 'restaurant', 'Restaurant', 3900, 'USD', 'month', true, true, 3),
  ('00000000-0000-4000-8000-000000001004', 'business', 'Business', 7900, 'USD', 'month', true, true, 4)
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.plan_features (plan_id, feature_key, limit_value) VALUES
  ('00000000-0000-4000-8000-000000001001', 'limit.products', 40),
  ('00000000-0000-4000-8000-000000001001', 'limit.users_per_branch', 1),
  ('00000000-0000-4000-8000-000000001002', 'menu.multilang', NULL),
  ('00000000-0000-4000-8000-000000001002', 'menu.branding', NULL),
  ('00000000-0000-4000-8000-000000001002', 'menu.table_qr', NULL),
  ('00000000-0000-4000-8000-000000001002', 'limit.users_per_branch', 1),
  ('00000000-0000-4000-8000-000000001003', 'menu.multilang', NULL),
  ('00000000-0000-4000-8000-000000001003', 'menu.branding', NULL),
  ('00000000-0000-4000-8000-000000001003', 'menu.table_qr', NULL),
  ('00000000-0000-4000-8000-000000001003', 'pos.access', NULL),
  ('00000000-0000-4000-8000-000000001003', 'kds.access', NULL),
  ('00000000-0000-4000-8000-000000001003', 'reports.basic', NULL),
  ('00000000-0000-4000-8000-000000001003', 'limit.users_per_branch', 10),
  ('00000000-0000-4000-8000-000000001003', 'limit.devices_per_branch', 4),
  ('00000000-0000-4000-8000-000000001004', 'menu.multilang', NULL),
  ('00000000-0000-4000-8000-000000001004', 'menu.branding', NULL),
  ('00000000-0000-4000-8000-000000001004', 'menu.table_qr', NULL),
  ('00000000-0000-4000-8000-000000001004', 'pos.access', NULL),
  ('00000000-0000-4000-8000-000000001004', 'kds.access', NULL),
  ('00000000-0000-4000-8000-000000001004', 'reports.basic', NULL),
  ('00000000-0000-4000-8000-000000001004', 'limit.users_per_branch', 10),
  ('00000000-0000-4000-8000-000000001004', 'limit.devices_per_branch', 4),
  ('00000000-0000-4000-8000-000000001004', 'reports.advanced', NULL),
  ('00000000-0000-4000-8000-000000001004', 'reports.export', NULL),
  ('00000000-0000-4000-8000-000000001004', 'branches.multi', NULL),
  ('00000000-0000-4000-8000-000000001004', 'roles.custom', NULL),
  ('00000000-0000-4000-8000-000000001004', 'ordering.table_qr', NULL),
  ('00000000-0000-4000-8000-000000001004', 'api.access', NULL)
ON CONFLICT (plan_id, feature_key) DO NOTHING;--> statement-breakpoint
UPDATE public.organizations SET status = 'active'::public.org_status WHERE status IN ('trial', 'past_due', 'cancelled');--> statement-breakpoint
ALTER TABLE public.organizations ALTER COLUMN status SET DEFAULT 'active'::public.org_status;--> statement-breakpoint
INSERT INTO public.subscriptions (id, org_id, plan_id, status, branch_quantity, trial_ends_at, provider)
SELECT gen_random_uuid(), o.id, '00000000-0000-4000-8000-000000001003', 'trialing', 1, now() + interval '14 days', NULL
FROM public.organizations o
ON CONFLICT (org_id) DO NOTHING;--> statement-breakpoint
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY subscriptions_tenant ON public.subscriptions
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
GRANT SELECT ON public.plans, public.plan_features TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.billing_events TO app_user;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON public.plans FROM app_user;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON public.plan_features FROM app_user;--> statement-breakpoint
REVOKE DELETE ON public.subscriptions, public.billing_events FROM app_user;--> statement-breakpoint
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO public.role_permissions (role_id, permission_key, org_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'billing.manage', NULL)
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.public_list_menu_sitemap()
RETURNS TABLE (slug text, default_locale text, locales text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.slug, o.default_locale, o.locales
  FROM public.organizations o
  WHERE o.status <> 'suspended'::public.org_status
  ORDER BY o.slug;
$$;
