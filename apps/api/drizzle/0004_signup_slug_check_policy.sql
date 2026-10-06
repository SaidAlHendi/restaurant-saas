-- Signup must check global org slug uniqueness before app.org_id is set.
-- Transaction-local: SET app.signup_slug_check = 'true' (see TenancyRepository.isOrgSlugTakenForSignup).

CREATE POLICY organizations_select_signup_slug ON public.organizations
  FOR SELECT
  USING (current_setting('app.signup_slug_check', true) = 'true');
