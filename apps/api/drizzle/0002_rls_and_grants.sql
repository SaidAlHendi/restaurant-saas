-- RLS tenant expression helpers applied inline:
-- current org: nullif(current_setting('app.org_id', true), '')::uuid
-- self-only (no org context): nullif(current_setting('app.org_id', true), '') IS NULL

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY organizations_tenant ON public.organizations
  USING (id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.org_id', true), '')::uuid);
CREATE POLICY organizations_select_member ON public.organizations
  FOR SELECT
  USING (
    nullif(current_setting('app.org_id', true), '') IS NULL
    AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = organizations.id
        AND m.user_id = nullif(current_setting('app.user_id', true), '')::uuid
        AND m.status = 'active'
    )
  );

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches FORCE ROW LEVEL SECURITY;
CREATE POLICY branches_tenant ON public.branches
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
CREATE POLICY roles_select ON public.roles
  FOR SELECT
  USING (
    (
      org_id IS NULL
      AND nullif(current_setting('app.org_id', true), '') IS NOT NULL
    )
    OR org_id = nullif(current_setting('app.org_id', true), '')::uuid
  );
CREATE POLICY roles_insert ON public.roles
  FOR INSERT
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
CREATE POLICY roles_update ON public.roles
  FOR UPDATE
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
CREATE POLICY roles_delete ON public.roles
  FOR DELETE
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT
  USING (
    (
      org_id IS NULL
      AND nullif(current_setting('app.org_id', true), '') IS NOT NULL
    )
    OR org_id = nullif(current_setting('app.org_id', true), '')::uuid
  );
CREATE POLICY role_permissions_insert ON public.role_permissions
  FOR INSERT
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
CREATE POLICY role_permissions_update ON public.role_permissions
  FOR UPDATE
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
CREATE POLICY role_permissions_delete ON public.role_permissions
  FOR DELETE
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY memberships_tenant ON public.memberships
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
CREATE POLICY memberships_select_self ON public.memberships
  FOR SELECT
  USING (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
    AND nullif(current_setting('app.org_id', true), '') IS NULL
  );

ALTER TABLE public.membership_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_branches FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_branches_tenant ON public.membership_branches
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

REVOKE ALL ON SCHEMA drizzle FROM app_user;
REVOKE ALL ON ALL TABLES IN SCHEMA drizzle FROM app_user;
