CREATE TYPE "public"."order_type" AS ENUM('dine_in', 'takeaway');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'placed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partial', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."order_item_status" AS ENUM('pending', 'preparing', 'ready', 'voided');--> statement-breakpoint
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_id_org_id_unique" UNIQUE("id","org_id");--> statement-breakpoint
CREATE TABLE "public"."tables" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"label" text NOT NULL,
	"qr_token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "tables_id_org_id_unique" UNIQUE("id","org_id"),
	CONSTRAINT "tables_branch_label_unique" UNIQUE("branch_id","label"),
	CONSTRAINT "tables_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
ALTER TABLE "public"."tables" ADD CONSTRAINT "tables_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."tables" ADD CONSTRAINT "tables_branch_id_org_id_branches_id_org_id_fk" FOREIGN KEY ("branch_id","org_id") REFERENCES "public"."branches"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "public"."branch_counters" (
	"branch_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"last_order_number" integer DEFAULT 0 NOT NULL,
	"org_id" uuid NOT NULL,
	CONSTRAINT "branch_counters_branch_id_business_date_pk" PRIMARY KEY("branch_id","business_date"),
	CONSTRAINT "branch_counters_last_order_number_nonneg" CHECK ("last_order_number" >= 0)
);
--> statement-breakpoint
ALTER TABLE "public"."branch_counters" ADD CONSTRAINT "branch_counters_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."branch_counters" ADD CONSTRAINT "branch_counters_branch_id_org_id_branches_id_org_id_fk" FOREIGN KEY ("branch_id","org_id") REFERENCES "public"."branches"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "public"."orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"client_order_id" uuid NOT NULL,
	"order_number" integer NOT NULL,
	"business_date" date NOT NULL,
	"type" "order_type" NOT NULL,
	"status" "order_status" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"table_id" uuid,
	"customer_name" text,
	"notes" text,
	"subtotal_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"cancel_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"placed_at" timestamptz,
	"completed_at" timestamptz,
	"cancelled_at" timestamptz,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "orders_id_org_id_unique" UNIQUE("id","org_id"),
	CONSTRAINT "orders_branch_client_order_id_unique" UNIQUE("branch_id","client_order_id"),
	CONSTRAINT "orders_branch_business_date_order_number_unique" UNIQUE("branch_id","business_date","order_number"),
	CONSTRAINT "orders_money_nonneg" CHECK ("subtotal_minor" >= 0 AND "discount_minor" >= 0 AND "tax_minor" >= 0 AND "total_minor" >= 0),
	CONSTRAINT "orders_version_positive" CHECK ("version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_branch_id_org_id_branches_id_org_id_fk" FOREIGN KEY ("branch_id","org_id") REFERENCES "public"."branches"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_table_id_org_id_tables_id_org_id_fk" FOREIGN KEY ("table_id","org_id") REFERENCES "public"."tables"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_created_by_memberships_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "public"."order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" jsonb NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"notes" text,
	"status" "order_item_status" DEFAULT 'pending' NOT NULL,
	"is_addition" boolean DEFAULT false NOT NULL,
	"voided_at" timestamptz,
	"void_reason" text,
	"voided_by" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_id_org_id_unique" UNIQUE("id","org_id"),
	CONSTRAINT "order_items_unit_price_nonneg" CHECK ("unit_price_minor" >= 0),
	CONSTRAINT "order_items_line_total_nonneg" CHECK ("line_total_minor" >= 0),
	CONSTRAINT "order_items_quantity_range" CHECK ("quantity" >= 1 AND "quantity" <= 999)
);
--> statement-breakpoint
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_order_id_org_id_orders_id_org_id_fk" FOREIGN KEY ("order_id","org_id") REFERENCES "public"."orders"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "public"."order_item_modifiers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"modifier_id" uuid NOT NULL,
	"name_snapshot" jsonb NOT NULL,
	"price_delta_minor" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "order_item_modifiers_price_delta_nonneg" CHECK ("price_delta_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "public"."order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_org_id_order_items_id_org_id_fk" FOREIGN KEY ("order_item_id","org_id") REFERENCES "public"."order_items"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "public"."order_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"type" text NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status",
	"payload" jsonb NOT NULL,
	"actor_membership_id" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."order_events" ADD CONSTRAINT "order_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."order_events" ADD CONSTRAINT "order_events_order_id_org_id_orders_id_org_id_fk" FOREIGN KEY ("order_id","org_id") REFERENCES "public"."orders"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."order_events" ADD CONSTRAINT "order_events_actor_membership_id_memberships_id_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "public"."outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"branch_id" uuid,
	"type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"published_at" timestamptz,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	CONSTRAINT "outbox_events_attempts_nonneg" CHECK ("attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "public"."outbox_events" ADD CONSTRAINT "outbox_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tables_branch_active_idx" ON "public"."tables" USING btree ("branch_id","is_active");--> statement-breakpoint
CREATE INDEX "orders_org_branch_created_idx" ON "public"."orders" USING btree ("org_id","branch_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "orders_branch_active_status_idx" ON "public"."orders" USING btree ("branch_id","status") WHERE "status" IN ('placed', 'preparing', 'ready');--> statement-breakpoint
CREATE INDEX "orders_org_business_date_idx" ON "public"."orders" USING btree ("org_id","business_date");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "public"."order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_events_order_created_idx" ON "public"."order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "outbox_unpublished_idx" ON "public"."outbox_events" USING btree ("created_at","id") WHERE "published_at" IS NULL;

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables FORCE ROW LEVEL SECURITY;
CREATE POLICY tables_tenant ON public.tables
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.branch_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_counters FORCE ROW LEVEL SECURITY;
CREATE POLICY branch_counters_tenant ON public.branch_counters
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
CREATE POLICY orders_tenant ON public.orders
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;
CREATE POLICY order_items_tenant ON public.order_items
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers FORCE ROW LEVEL SECURITY;
CREATE POLICY order_item_modifiers_tenant ON public.order_item_modifiers
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events FORCE ROW LEVEL SECURITY;
CREATE POLICY order_events_tenant ON public.order_events
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events FORCE ROW LEVEL SECURITY;
CREATE POLICY outbox_events_tenant ON public.outbox_events
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY outbox_events_worker ON public.outbox_events
  FOR ALL TO app_worker
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tables TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branch_counters TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_items TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_item_modifiers TO app_user;
GRANT SELECT, INSERT ON TABLE public.order_events TO app_user;
REVOKE UPDATE, DELETE ON TABLE public.order_events FROM app_user;

GRANT INSERT ON TABLE public.outbox_events TO app_user;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.outbox_events FROM app_user;

GRANT SELECT, UPDATE ON TABLE public.outbox_events TO app_worker;

ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

INSERT INTO public.role_permissions (role_id, permission_key, org_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'orders.read', NULL),
  ('00000000-0000-4000-8000-000000000101', 'orders.update_status', NULL),
  ('00000000-0000-4000-8000-000000000102', 'orders.read', NULL),
  ('00000000-0000-4000-8000-000000000102', 'orders.update_status', NULL),
  ('00000000-0000-4000-8000-000000000103', 'orders.read', NULL),
  ('00000000-0000-4000-8000-000000000103', 'orders.update_status', NULL),
  ('00000000-0000-4000-8000-000000000104', 'orders.read', NULL),
  ('00000000-0000-4000-8000-000000000104', 'orders.update_status', NULL)
ON CONFLICT (role_id, permission_key) DO NOTHING;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
