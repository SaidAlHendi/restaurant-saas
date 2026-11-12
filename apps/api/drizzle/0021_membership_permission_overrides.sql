CREATE TABLE "membership_permission_overrides" (
	"membership_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	"effect" text NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_permission_overrides_membership_id_permission_key_pk" PRIMARY KEY("membership_id","permission_key"),
	CONSTRAINT "membership_permission_overrides_effect_check" CHECK ("effect" IN ('grant', 'deny'))
);--> statement-breakpoint
ALTER TABLE "membership_permission_overrides" ADD CONSTRAINT "membership_permission_overrides_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permission_overrides" ADD CONSTRAINT "membership_permission_overrides_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE public.membership_permission_overrides ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.membership_permission_overrides FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY membership_permission_overrides_tenant ON public.membership_permission_overrides
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_permission_overrides TO app_user;--> statement-breakpoint
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO public.role_permissions (role_id, permission_key, org_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'tables.rotate_qr', NULL)
ON CONFLICT (role_id, permission_key) DO NOTHING;--> statement-breakpoint
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
