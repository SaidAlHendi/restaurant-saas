ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO public.role_permissions (role_id, permission_key, org_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'orders.reopen', NULL),
  ('00000000-0000-4000-8000-000000000102', 'orders.reopen', NULL)
ON CONFLICT (role_id, permission_key) DO NOTHING;--> statement-breakpoint
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
