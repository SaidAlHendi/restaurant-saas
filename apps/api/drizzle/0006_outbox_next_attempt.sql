ALTER TABLE "public"."outbox_events" ADD COLUMN "next_attempt_at" timestamptz;--> statement-breakpoint
DROP INDEX IF EXISTS "public"."outbox_unpublished_idx";--> statement-breakpoint
CREATE INDEX "outbox_unpublished_idx" ON "public"."outbox_events" USING btree ("created_at","id") WHERE "published_at" IS NULL;
