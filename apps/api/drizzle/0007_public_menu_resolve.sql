CREATE OR REPLACE FUNCTION public.public_resolve_org(p_slug text)
RETURNS TABLE (
  org_id uuid,
  status public.org_status,
  default_locale text,
  locales text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.status, o.default_locale, o.locales
  FROM public.organizations o
  WHERE o.slug = p_slug
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_resolve_table(p_token text)
RETURNS TABLE (
  org_id uuid,
  branch_id uuid,
  table_id uuid,
  label text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.org_id, t.branch_id, t.id, t.label
  FROM public.tables t
  INNER JOIN public.branches b
    ON b.id = t.branch_id AND b.org_id = t.org_id
  WHERE t.qr_token = p_token
    AND t.is_active = true
    AND b.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_list_menu_sitemap()
RETURNS TABLE (
  slug text,
  default_locale text,
  locales text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.slug, o.default_locale, o.locales
  FROM public.organizations o
  WHERE o.status IN ('trial', 'active', 'past_due')
  ORDER BY o.slug;
$$;

ALTER FUNCTION public.public_resolve_org(text) OWNER TO app_owner;
ALTER FUNCTION public.public_resolve_table(text) OWNER TO app_owner;
ALTER FUNCTION public.public_list_menu_sitemap() OWNER TO app_owner;

REVOKE ALL ON FUNCTION public.public_resolve_org(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_resolve_table(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_list_menu_sitemap() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.public_resolve_org(text) TO app_user;
GRANT EXECUTE ON FUNCTION public.public_resolve_table(text) TO app_user;
GRANT EXECUTE ON FUNCTION public.public_list_menu_sitemap() TO app_user;

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
