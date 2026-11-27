-- The admin restaurant page shows menu, table and POS device numbers. Read-only and column-limited:
-- app_admin bypasses RLS, so it gets no QR tokens, pairing codes or device keys (same role guard as 0013).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    EXECUTE 'GRANT SELECT (id, org_id, deleted_at) ON public.categories TO app_admin';
    EXECUTE 'GRANT SELECT (id, org_id, deleted_at) ON public.products TO app_admin';
    EXECUTE 'GRANT SELECT (id, org_id, branch_id, is_active) ON public.tables TO app_admin';
    EXECUTE 'GRANT SELECT (id, org_id, branch_id, name, status, last_used_at, created_at) ON public.pos_devices TO app_admin';
  END IF;
END
$$;
