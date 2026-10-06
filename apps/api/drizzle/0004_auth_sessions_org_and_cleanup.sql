-- Remove signup slug visibility backdoor if a legacy DB applied it.
DROP POLICY IF EXISTS organizations_select_signup_slug ON public.organizations;

-- Kitchen system role has no permissions in roadmap item 2.
DELETE FROM public.role_permissions
WHERE role_id = '00000000-0000-4000-8000-000000000104';

-- Legacy databases created before auth_sessions.org_id was in 0001.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auth_sessions'
      AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.auth_sessions ADD COLUMN org_id uuid;

    UPDATE public.auth_sessions s
    SET org_id = COALESCE(
      (SELECT u.last_org_id FROM public.users u WHERE u.id = s.user_id),
      (
        SELECT m.org_id
        FROM public.memberships m
        WHERE m.user_id = s.user_id
          AND m.status = 'active'
        ORDER BY m.created_at
        LIMIT 1
      )
    );

    DELETE FROM public.auth_sessions WHERE org_id IS NULL;

    ALTER TABLE public.auth_sessions ALTER COLUMN org_id SET NOT NULL;

    ALTER TABLE public.auth_sessions
      ADD CONSTRAINT auth_sessions_org_id_organizations_id_fk
      FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
