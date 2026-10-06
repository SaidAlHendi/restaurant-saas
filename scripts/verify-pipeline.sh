#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
source ~/.nvm/nvm.sh 2>/dev/null || true
nvm use 22 2>/dev/null || nvm use 2>/dev/null || true
pnpm install --frozen-lockfile=false

run_step() {
  local name="$1"
  shift
  echo "===== $name =====" >> .verify-pipeline.log
  "$@" >> .verify-pipeline.log 2>&1
  local code=$?
  echo "EXIT_CODE:$code" >> .verify-pipeline.log
  tail -15 .verify-pipeline.log | head -15
  return "$code"
}

: > .verify-pipeline.log
FAIL=0
run_step "pnpm lint" pnpm lint || FAIL=1
run_step "pnpm typecheck" pnpm typecheck || FAIL=1
run_step "pnpm test" pnpm test || FAIL=1
run_step "pnpm build" pnpm build || FAIL=1
exit "$FAIL"
