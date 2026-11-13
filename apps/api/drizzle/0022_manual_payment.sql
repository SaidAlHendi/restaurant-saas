ALTER TABLE "subscriptions" ADD COLUMN "manual_paid" boolean;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "manual_amount_minor" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "manual_note" text;--> statement-breakpoint
-- app_admin records what a manually activated restaurant paid (same role guard as 0013: the role is
-- created by infra, so skip when it does not exist yet).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    EXECUTE 'GRANT UPDATE (manual_paid, manual_amount_minor, manual_note) ON public.subscriptions TO app_admin';
  END IF;
END
$$;
