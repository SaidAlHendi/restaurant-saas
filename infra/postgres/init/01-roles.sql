-- Local / CI only. Production roles are created separately.
-- Passwords must match .env.example and CI workflow env.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_owner') THEN
    CREATE ROLE app_owner LOGIN PASSWORD 'app_owner_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_worker') THEN
    CREATE ROLE app_worker LOGIN PASSWORD 'app_worker_dev' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

DO $$
DECLARE
  dbname text := current_database();
BEGIN
  EXECUTE format('ALTER DATABASE %I OWNER TO app_owner', dbname);
END
$$;

ALTER SCHEMA public OWNER TO app_owner;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT USAGE ON SCHEMA public TO app_worker;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT USAGE ON SCHEMA public TO app_worker;

-- Platform admin runtime role (apps/api /v1/admin/*). BYPASSRLS so cross-tenant reads work; privileges are
-- narrowed per table by migration 0013 (SELECT mostly, UPDATE only organizations.status and subscription
-- overrides, no DELETE, no users.password_hash). Re-run this file after pulling 0013, before db:migrate.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin LOGIN PASSWORD 'app_admin_dev' NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_admin;
