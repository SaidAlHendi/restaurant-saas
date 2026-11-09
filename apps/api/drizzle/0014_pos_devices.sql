CREATE TYPE "public"."pos_device_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TABLE "public"."pos_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "pos_device_status" DEFAULT 'pending' NOT NULL,
	"pairing_code_hash" text,
	"pairing_expires_at" timestamptz,
	"device_key_hash" text,
	"created_by" uuid NOT NULL,
	"paired_at" timestamptz,
	"last_used_at" timestamptz,
	"revoked_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "pos_devices_id_org_id_unique" UNIQUE("id","org_id"),
	CONSTRAINT "pos_devices_name_not_blank" CHECK (length(btrim("name")) > 0)
);--> statement-breakpoint
ALTER TABLE "public"."pos_devices" ADD CONSTRAINT "pos_devices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."pos_devices" ADD CONSTRAINT "pos_devices_branch_id_org_id_branches_id_org_id_fk" FOREIGN KEY ("branch_id","org_id") REFERENCES "public"."branches"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."pos_devices" ADD CONSTRAINT "pos_devices_created_by_memberships_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pos_devices_pairing_code_hash_unique" ON "public"."pos_devices" USING btree ("pairing_code_hash") WHERE "pairing_code_hash" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pos_devices_device_key_hash_unique" ON "public"."pos_devices" USING btree ("device_key_hash") WHERE "device_key_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "pos_devices_org_branch_idx" ON "public"."pos_devices" USING btree ("org_id","branch_id");--> statement-breakpoint
ALTER TABLE public.pos_devices ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.pos_devices FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY pos_devices_tenant ON public.pos_devices
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
-- The SECURITY DEFINER functions below run as app_owner and must see rows across tenants.
CREATE POLICY pos_devices_select_app_owner ON public.pos_devices
  FOR SELECT
  TO app_owner
  USING (true);--> statement-breakpoint
CREATE POLICY pos_devices_update_app_owner ON public.pos_devices
  FOR UPDATE
  TO app_owner
  USING (true)
  WITH CHECK (true);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.pos_devices TO app_user;--> statement-breakpoint
REVOKE DELETE ON TABLE public.pos_devices FROM app_user;--> statement-breakpoint
-- Pairing: atomically turns a pending device into an active one. Returns nothing for an unknown,
-- used or expired code. The raw code and device key never reach the database, only their hashes.
CREATE OR REPLACE FUNCTION public.pair_pos_device(p_code_hash text, p_key_hash text, p_now timestamptz)
RETURNS TABLE (device_id uuid, org_id uuid, branch_id uuid, device_name text)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pos_devices d
  SET status = 'active'::public.pos_device_status,
      device_key_hash = p_key_hash,
      pairing_code_hash = NULL,
      pairing_expires_at = NULL,
      paired_at = p_now
  WHERE d.pairing_code_hash = p_code_hash
    AND d.status = 'pending'::public.pos_device_status
    AND d.pairing_expires_at > p_now
  RETURNING d.id, d.org_id, d.branch_id, d.name;
$$;--> statement-breakpoint
ALTER FUNCTION public.pair_pos_device(text, text, timestamptz) OWNER TO app_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.pair_pos_device(text, text, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.pair_pos_device(text, text, timestamptz) TO app_user;--> statement-breakpoint
-- Resolves an active device from the hash of its key.
CREATE OR REPLACE FUNCTION public.resolve_pos_device(p_key_hash text)
RETURNS TABLE (device_id uuid, org_id uuid, branch_id uuid, device_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.org_id, d.branch_id, d.name
  FROM public.pos_devices d
  WHERE d.device_key_hash = p_key_hash
    AND d.status = 'active'::public.pos_device_status
  LIMIT 1;
$$;--> statement-breakpoint
ALTER FUNCTION public.resolve_pos_device(text) OWNER TO app_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.resolve_pos_device(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.resolve_pos_device(text) TO app_user;
