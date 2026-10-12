ALTER TABLE "public"."branches" ADD COLUMN "pay_before_send" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."branches" ADD COLUMN "accepts_card" boolean DEFAULT true NOT NULL;
