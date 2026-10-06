#!/usr/bin/env bash
# One-time (or idempotent) setup for shared local Postgres, e.g. ~/docker/local-db postgres-dev.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROLES_SQL="${ROOT}/infra/postgres/init/01-roles.sql"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres-dev}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-rootpass}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

DATABASES=(restaurant_saas restaurant_saas_test)

if [[ ! -f "${ROLES_SQL}" ]]; then
  echo "Missing ${ROLES_SQL}" >&2
  exit 1
fi

run_psql_admin() {
  local db="$1"
  shift
  if docker ps --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
    docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD}" "${POSTGRES_CONTAINER}" \
      psql -U "${POSTGRES_USER}" -d "${db}" "$@"
  else
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${db}" "$@"
  fi
}

run_psql_postgres() {
  run_psql_admin postgres "$@"
}

echo "Creating databases (if missing)…"
for db in "${DATABASES[@]}"; do
  run_psql_postgres -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname = '${db}'" | grep -q 1 \
    || run_psql_postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db};"
done

echo "Applying app roles (01-roles.sql) per database…"
for db in "${DATABASES[@]}"; do
  echo "  → ${db}"
  if docker ps --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
    docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD}" "${POSTGRES_CONTAINER}" \
      psql -U "${POSTGRES_USER}" -v ON_ERROR_STOP=1 -d "${db}" < "${ROLES_SQL}"
  else
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" \
      -U "${POSTGRES_USER}" -v ON_ERROR_STOP=1 -d "${db}" -f "${ROLES_SQL}"
  fi
done

echo "Done. Use DATABASE_URL / DATABASE_URL_TEST on localhost:${POSTGRES_PORT} (see .env.example)."
