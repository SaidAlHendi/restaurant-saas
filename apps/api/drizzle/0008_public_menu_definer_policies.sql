-- SECURITY DEFINER helpers run as app_owner; FORCE RLS still applies without a matching policy.
CREATE POLICY organizations_select_app_owner ON public.organizations
  FOR SELECT
  TO app_owner
  USING (true);

CREATE POLICY branches_select_app_owner ON public.branches
  FOR SELECT
  TO app_owner
  USING (true);

CREATE POLICY tables_select_app_owner ON public.tables
  FOR SELECT
  TO app_owner
  USING (true);
