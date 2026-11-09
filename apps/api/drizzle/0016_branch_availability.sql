ALTER TABLE "public"."products" ADD COLUMN "available_in_all_branches" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."categories" ADD COLUMN "available_in_all_branches" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TABLE "public"."product_branches" (
	"product_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	CONSTRAINT "product_branches_product_id_branch_id_pk" PRIMARY KEY("product_id","branch_id")
);--> statement-breakpoint
CREATE TABLE "public"."category_branches" (
	"category_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	CONSTRAINT "category_branches_category_id_branch_id_pk" PRIMARY KEY("category_id","branch_id")
);--> statement-breakpoint
ALTER TABLE "public"."product_branches" ADD CONSTRAINT "product_branches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."product_branches" ADD CONSTRAINT "product_branches_product_id_org_id_products_id_org_id_fk" FOREIGN KEY ("product_id","org_id") REFERENCES "public"."products"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."product_branches" ADD CONSTRAINT "product_branches_branch_id_org_id_branches_id_org_id_fk" FOREIGN KEY ("branch_id","org_id") REFERENCES "public"."branches"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."category_branches" ADD CONSTRAINT "category_branches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."category_branches" ADD CONSTRAINT "category_branches_category_id_org_id_categories_id_org_id_fk" FOREIGN KEY ("category_id","org_id") REFERENCES "public"."categories"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."category_branches" ADD CONSTRAINT "category_branches_branch_id_org_id_branches_id_org_id_fk" FOREIGN KEY ("branch_id","org_id") REFERENCES "public"."branches"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_branches_branch_product_idx" ON "public"."product_branches" USING btree ("branch_id","product_id");--> statement-breakpoint
CREATE INDEX "category_branches_branch_category_idx" ON "public"."category_branches" USING btree ("branch_id","category_id");--> statement-breakpoint
ALTER TABLE public.product_branches ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.product_branches FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY product_branches_tenant ON public.product_branches
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE public.category_branches ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.category_branches FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY category_branches_tenant ON public.category_branches
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_branches TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.category_branches TO app_user;
