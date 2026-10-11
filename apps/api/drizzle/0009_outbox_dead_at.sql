ALTER TABLE "public"."outbox_events" ADD COLUMN "dead_at" timestamptz;--> statement-breakpoint
UPDATE "public"."outbox_events"
SET "dead_at" = "published_at",
    "published_at" = NULL
WHERE "published_at" IS NOT NULL
  AND ("attempts" >= 10 OR "branch_id" IS NULL);--> statement-breakpoint
DROP INDEX IF EXISTS "public"."outbox_unpublished_idx";--> statement-breakpoint
CREATE INDEX "outbox_unpublished_idx" ON "public"."outbox_events" USING btree ("created_at","id") WHERE "published_at" IS NULL AND "dead_at" IS NULL;
