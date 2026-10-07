CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "categories_id_org_id_unique" UNIQUE("id","org_id")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"min_select" smallint DEFAULT 0 NOT NULL,
	"max_select" smallint NOT NULL,
	"deleted_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "modifier_groups_id_org_id_unique" UNIQUE("id","org_id"),
	CONSTRAINT "modifier_groups_select_bounds" CHECK (min_select >= 0 AND min_select <= max_select AND max_select >= 1)
);
--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"price_minor" bigint NOT NULL,
	"image_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "products_id_org_id_unique" UNIQUE("id","org_id")
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_org_id_categories_id_org_id_fk" FOREIGN KEY ("category_id","org_id") REFERENCES "public"."categories"("id","org_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "modifiers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"price_delta_minor" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_group_id_org_id_modifier_groups_id_org_id_fk" FOREIGN KEY ("group_id","org_id") REFERENCES "public"."modifier_groups"("id","org_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "product_modifier_groups" (
	"product_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_modifier_groups_product_id_group_id_pk" PRIMARY KEY("product_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_product_id_org_id_products_id_org_id_fk" FOREIGN KEY ("product_id","org_id") REFERENCES "public"."products"("id","org_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_group_id_org_id_modifier_groups_id_org_id_fk" FOREIGN KEY ("group_id","org_id") REFERENCES "public"."modifier_groups"("id","org_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "categories_org_sort_idx" ON "categories" USING btree ("org_id","sort_order") WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "products_org_category_sort_idx" ON "products" USING btree ("org_id","category_id","sort_order") WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "products_org_active_idx" ON "products" USING btree ("org_id","is_active") WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "modifier_groups_org_idx" ON "modifier_groups" USING btree ("org_id") WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "modifiers_group_sort_idx" ON "modifiers" USING btree ("group_id","sort_order") WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "product_modifier_groups_product_idx" ON "product_modifier_groups" USING btree ("product_id","sort_order");

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
CREATE POLICY categories_tenant ON public.categories
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
CREATE POLICY products_tenant ON public.products
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups FORCE ROW LEVEL SECURITY;
CREATE POLICY modifier_groups_tenant ON public.modifier_groups
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers FORCE ROW LEVEL SECURITY;
CREATE POLICY modifiers_tenant ON public.modifiers
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.product_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifier_groups FORCE ROW LEVEL SECURITY;
CREATE POLICY product_modifier_groups_tenant ON public.product_modifier_groups
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modifier_groups TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modifiers TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_modifier_groups TO app_user;

ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

INSERT INTO public.role_permissions (role_id, permission_key, org_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'menu.read', NULL),
  ('00000000-0000-4000-8000-000000000102', 'menu.read', NULL),
  ('00000000-0000-4000-8000-000000000103', 'menu.read', NULL)
ON CONFLICT (role_id, permission_key) DO NOTHING;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
