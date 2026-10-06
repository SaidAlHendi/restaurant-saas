#!/usr/bin/env bash
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

LOG_FILE="$REPO_ROOT/.tmp-scaffold-verify.log"
SUMMARY_FILE="$REPO_ROOT/.tmp-scaffold-verify-summary.txt"
: > "$LOG_FILE"
: > "$SUMMARY_FILE"

run_step() {
  local name="$1"
  shift
  echo "========== STEP: $name ==========" | tee -a "$LOG_FILE"
  echo "Command: $*" | tee -a "$LOG_FILE"
  set +e
  "$@" >> "$LOG_FILE" 2>&1
  local ec=$?
  set -e
  echo "EXIT_CODE: $ec" | tee -a "$LOG_FILE" "$SUMMARY_FILE"
  echo "--- LAST 30 LINES ($name) ---" | tee -a "$SUMMARY_FILE"
  tail -n 30 "$LOG_FILE" | tee -a "$SUMMARY_FILE"
  echo "" | tee -a "$SUMMARY_FILE"
  return "$ec"
}

# 1. .env
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
# Ensure DATABASE_URL and REDIS_URL (user requested rootpass)
if grep -q '^DATABASE_URL=' .env; then
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:rootpass@localhost:5432/restaurant_saas|' .env
else
  echo 'DATABASE_URL=postgresql://postgres:rootpass@localhost:5432/restaurant_saas' >> .env
fi
if grep -q '^REDIS_URL=' .env; then
  sed -i 's|^REDIS_URL=.*|REDIS_URL=redis://localhost:6379|' .env
else
  echo 'REDIS_URL=redis://localhost:6379' >> .env
fi
echo "Configured .env (DATABASE_URL, REDIS_URL)" | tee -a "$LOG_FILE"

# 2. nvm + corepack
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
fi
run_step "corepack_enable" corepack enable
run_step "corepack_prepare_pnpm" corepack prepare pnpm@10.14.0 --activate

# Docker if needed
if ! docker compose ps --status running 2>/dev/null | grep -q postgres; then
  run_step "docker_compose_up" docker compose up -d
fi

FAILED=0

run_step "pnpm_install" pnpm install || FAILED=1
run_step "pnpm_db_migrate" pnpm db:migrate || FAILED=1
run_step "pnpm_lint" pnpm lint || FAILED=1
run_step "pnpm_typecheck" pnpm typecheck || FAILED=1
run_step "pnpm_test" pnpm test || FAILED=1
run_step "pnpm_build" pnpm build || FAILED=1

echo "OVERALL_FAILED: $FAILED" | tee -a "$LOG_FILE" "$SUMMARY_FILE"
exit "$FAILED"
