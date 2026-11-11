-- Display currency: prices stay in the base currency (organizations.default_currency); staff and
-- guests can be shown another currency at a rate the owner types in. Each order freezes the rate
-- and rounding it was created with, so later rate changes never rewrite past orders.
ALTER TABLE "public"."organizations" ADD COLUMN "display_currency" text;--> statement-breakpoint
ALTER TABLE "public"."organizations" ADD COLUMN "exchange_rate" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "public"."organizations" ADD COLUMN "exchange_rate_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "public"."organizations" ADD COLUMN "display_item_step" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."organizations" ADD COLUMN "display_total_step" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_exchange_rate_positive" CHECK ("exchange_rate" IS NULL OR "exchange_rate" > 0);--> statement-breakpoint
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_display_currency_needs_rate" CHECK ("display_currency" IS NULL OR "exchange_rate" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_display_steps_nonneg" CHECK ("display_item_step" >= 0 AND "display_total_step" >= 0);--> statement-breakpoint
ALTER TABLE "public"."orders" ADD COLUMN "display_currency" text;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD COLUMN "exchange_rate" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "public"."orders" ADD COLUMN "display_item_step" integer;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD COLUMN "display_total_step" integer;--> statement-breakpoint
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_display_currency_complete" CHECK (
  ("display_currency" IS NULL AND "exchange_rate" IS NULL AND "display_item_step" IS NULL AND "display_total_step" IS NULL)
  OR ("display_currency" IS NOT NULL AND "exchange_rate" > 0 AND "display_item_step" >= 0 AND "display_total_step" >= 0)
);--> statement-breakpoint
ALTER TABLE "public"."payments" ADD COLUMN "display_tendered_minor" bigint;--> statement-breakpoint
ALTER TABLE "public"."payments" ADD COLUMN "display_change_minor" bigint;--> statement-breakpoint
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_display_amounts_nonneg" CHECK (
  ("display_tendered_minor" IS NULL OR "display_tendered_minor" >= 0)
  AND ("display_change_minor" IS NULL OR "display_change_minor" >= 0)
);
