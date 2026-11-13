CREATE TYPE "public"."bill_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "public"."bills" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"label" text,
	"status" "bill_status" DEFAULT 'open' NOT NULL,
	"opened_by" uuid NOT NULL,
	"opened_at" timestamptz DEFAULT now() NOT NULL,
	"closed_at" timestamptz,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "bills_id_org_id_unique" UNIQUE("id","org_id")
);
--> statement-breakpoint
ALTER TABLE "public"."bills" ADD CONSTRAINT "bills_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."bills" ADD CONSTRAINT "bills_branch_id_org_id_branches_id_org_id_fk" FOREIGN KEY ("branch_id","org_id") REFERENCES "public"."branches"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."bills" ADD CONSTRAINT "bills_table_id_org_id_tables_id_org_id_fk" FOREIGN KEY ("table_id","org_id") REFERENCES "public"."tables"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."bills" ADD CONSTRAINT "bills_opened_by_memberships_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bills_branch_table_open_idx" ON "public"."bills" ("branch_id","table_id") WHERE "status" = 'open';--> statement-breakpoint
ALTER TABLE "public"."orders" ADD COLUMN "bill_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_bill_id_org_id_bills_id_org_id_fk" FOREIGN KEY ("bill_id","org_id") REFERENCES "public"."bills"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_bill_id_idx" ON "public"."orders" ("bill_id") WHERE "bill_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."order_items" ADD COLUMN "seat" text;--> statement-breakpoint
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_seat_length" CHECK ("seat" IS NULL OR char_length("seat") BETWEEN 1 AND 24);--> statement-breakpoint
CREATE TABLE "public"."payment_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	CONSTRAINT "payment_items_amount_positive" CHECK ("amount_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "public"."payment_items" ADD CONSTRAINT "payment_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."payment_items" ADD CONSTRAINT "payment_items_payment_id_org_id_payments_id_org_id_fk" FOREIGN KEY ("payment_id","org_id") REFERENCES "public"."payments"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."payment_items" ADD CONSTRAINT "payment_items_order_item_id_org_id_order_items_id_org_id_fk" FOREIGN KEY ("order_item_id","org_id") REFERENCES "public"."order_items"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_items_order_item_idx" ON "public"."payment_items" ("order_item_id");

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills FORCE ROW LEVEL SECURITY;
CREATE POLICY bills_tenant ON public.bills
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON TABLE public.bills TO app_user;
REVOKE DELETE ON TABLE public.bills FROM app_user;

ALTER TABLE public.payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_items FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_items_tenant ON public.payment_items
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
GRANT SELECT, INSERT ON TABLE public.payment_items TO app_user;
REVOKE UPDATE, DELETE ON TABLE public.payment_items FROM app_user;
