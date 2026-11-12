#!/bin/sh
# Runs once, the first time the Postgres container starts with an empty data volume.
# Creates the four application roles with real passwords (the local/CI file
# infra/postgres/init/01-roles.sql has fixed dev passwords and must NOT be used here).
set -eu

for v in APP_OWNER_PASSWORD APP_USER_PASSWORD APP_WORKER_PASSWORD APP_ADMIN_PASSWORD; do
  eval "val=\${$v:-}"
  if [ -z "$val" ]; then
    echo "01-roles.sh: $v is not set" >&2
    exit 1
  fi
done

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v owner_pw="$APP_OWNER_PASSWORD" \
  -v user_pw="$APP_USER_PASSWORD" \
  -v worker_pw="$APP_WORKER_PASSWORD" \
  -v admin_pw="$APP_ADMIN_PASSWORD" <<'SQL'
CREATE ROLE app_owner  LOGIN PASSWORD :'owner_pw'  NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE app_user   LOGIN PASSWORD :'user_pw'   NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
CREATE ROLE app_worker LOGIN PASSWORD :'worker_pw' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
-- Platform admin runtime role: BYPASSRLS, privileges narrowed per table by migration 0013.
CREATE ROLE app_admin  LOGIN PASSWORD :'admin_pw'  NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;

ALTER DATABASE restaurant_saas OWNER TO app_owner;
ALTER SCHEMA public OWNER TO app_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user, app_worker, app_admin;
SQL
