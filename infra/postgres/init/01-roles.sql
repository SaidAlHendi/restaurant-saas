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

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;
