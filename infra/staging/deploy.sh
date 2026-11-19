#!/usr/bin/env bash
# Staging helper. Run from anywhere inside the repo, on the laptop (in Ubuntu).
#   ./infra/staging/deploy.sh gen-secrets   print random passwords/secrets to paste into staging.env
#   ./infra/staging/deploy.sh up            build and start (or update) the stack
#   ./infra/staging/deploy.sh update        git pull the current branch, then up
#   ./infra/staging/deploy.sh status        show containers and the API readiness check
#   ./infra/staging/deploy.sh logs [svc]    follow logs (default: all)
#   ./infra/staging/deploy.sh down          stop the stack (data volumes are kept)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${HERE}/staging.env"
COMPOSE=(docker compose --env-file "${ENV_FILE}" -f "${HERE}/docker-compose.yml")

need_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Missing ${ENV_FILE}. Copy staging.env.example to staging.env and fill it in." >&2
    exit 1
  fi
  chmod 600 "${ENV_FILE}"
}

cmd="${1:-}"
shift || true

case "${cmd}" in
  gen-secrets)
    for name in POSTGRES_PASSWORD APP_OWNER_PASSWORD APP_USER_PASSWORD APP_WORKER_PASSWORD \
      APP_ADMIN_PASSWORD REDIS_PASSWORD JWT_ACCESS_SECRET JWT_ADMIN_SECRET; do
      echo "${name}=$(openssl rand -hex 24)"
    done
    ;;
  up)
    need_env
    "${COMPOSE[@]}" up -d --build --remove-orphans
    "${COMPOSE[@]}" ps
    ;;
  update)
    need_env
    git -C "${HERE}" pull --ff-only
    "${COMPOSE[@]}" up -d --build --remove-orphans
    "${COMPOSE[@]}" ps
    ;;
  status)
    need_env
    "${COMPOSE[@]}" ps
    "${COMPOSE[@]}" exec -T api node -e "fetch('http://127.0.0.1:3000/v1/ready').then(async r=>{console.log(r.status, await r.text())})"
    ;;
  logs)
    need_env
    "${COMPOSE[@]}" logs -f --tail=100 "$@"
    ;;
  down)
    need_env
    "${COMPOSE[@]}" down
    ;;
  *)
    sed -n '2,10p' "${BASH_SOURCE[0]}"
    exit 1
    ;;
esac
