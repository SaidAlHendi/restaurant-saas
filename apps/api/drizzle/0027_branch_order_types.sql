ALTER TABLE "public"."branches" ADD COLUMN "supports_dine_in" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."branches" ADD COLUMN "supports_takeaway" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_order_type_required" CHECK ("supports_dine_in" OR "supports_takeaway");
