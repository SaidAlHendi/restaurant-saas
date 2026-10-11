CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('captured', 'refunded');--> statement-breakpoint
CREATE TABLE "public"."payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"client_payment_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"tendered_minor" bigint,
	"change_minor" bigint,
	"status" "payment_record_status" DEFAULT 'captured' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "payments_id_org_id_unique" UNIQUE("id","org_id"),
	CONSTRAINT "payments_order_client_payment_unique" UNIQUE("order_id","client_payment_id"),
	CONSTRAINT "payments_amount_positive" CHECK ("amount_minor" > 0),
	CONSTRAINT "payments_tendered_nonneg" CHECK ("tendered_minor" IS NULL OR "tendered_minor" >= 0),
	CONSTRAINT "payments_change_nonneg" CHECK ("change_minor" IS NULL OR "change_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_order_id_org_id_orders_id_org_id_fk" FOREIGN KEY ("order_id","org_id") REFERENCES "public"."orders"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_created_by_memberships_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "public"."payments" USING btree ("order_id");

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
CREATE POLICY payments_tenant ON public.payments
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

GRANT SELECT, INSERT ON TABLE public.payments TO app_user;
REVOKE UPDATE, DELETE ON TABLE public.payments FROM app_user;
