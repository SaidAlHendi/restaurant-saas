-- Legacy DBs may still have kitchen system role grants from an older 0003 seed.
DELETE FROM public.role_permissions
WHERE role_id = '00000000-0000-4000-8000-000000000104';
