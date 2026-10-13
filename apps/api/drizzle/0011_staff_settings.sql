ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;--> statement-breakpoint
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;--> statement-breakpoint
ALTER TABLE public.memberships ADD COLUMN pin_failed_attempts integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE public.memberships ADD COLUMN pin_locked_until timestamptz;--> statement-breakpoint
ALTER TABLE public.memberships ADD COLUMN invite_token_hash text;--> statement-breakpoint
ALTER TABLE public.memberships ADD COLUMN invite_expires_at timestamptz;--> statement-breakpoint
ALTER TABLE public.memberships ADD COLUMN invited_by_membership_id uuid;--> statement-breakpoint
ALTER TABLE public.memberships ADD CONSTRAINT memberships_invited_by_membership_id_fk FOREIGN KEY (invited_by_membership_id) REFERENCES public.memberships(id) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX memberships_invite_token_hash_unique ON public.memberships USING btree (invite_token_hash) WHERE invite_token_hash IS NOT NULL;--> statement-breakpoint
ALTER TABLE public.order_events ADD COLUMN approved_by_membership_id uuid;--> statement-breakpoint
ALTER TABLE public.order_events ADD CONSTRAINT order_events_approved_by_membership_id_fk FOREIGN KEY (approved_by_membership_id) REFERENCES public.memberships(id) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO public.role_permissions (role_id, permission_key, org_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'org.manage', NULL)
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY memberships_select_app_owner ON public.memberships
  FOR SELECT
  TO app_owner
  USING (true);--> statement-breakpoint
CREATE POLICY roles_select_app_owner ON public.roles
  FOR SELECT
  TO app_owner
  USING (true);--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.resolve_invite(p_token_hash text)
RETURNS TABLE (
  membership_id uuid,
  org_id uuid,
  org_name text,
  email text,
  role_key text,
  status public.membership_status,
  invite_expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.org_id,
    o.name,
    u.email,
    r.key,
    m.status,
    m.invite_expires_at
  FROM public.memberships m
  INNER JOIN public.organizations o ON o.id = m.org_id
  INNER JOIN public.users u ON u.id = m.user_id
  INNER JOIN public.roles r ON r.id = m.role_id
  WHERE m.invite_token_hash = p_token_hash
    AND m.status = 'invited'::public.membership_status
  LIMIT 1;
$$;--> statement-breakpoint
ALTER FUNCTION public.resolve_invite(text) OWNER TO app_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.resolve_invite(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.resolve_invite(text) TO app_user;
