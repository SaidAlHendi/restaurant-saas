#!/usr/bin/env bash
set -uo pipefail
REPO=/home/said/projects/repo/restaurant-saas
cd "$REPO"
OUT="$REPO/.tmp-pipeline-results.txt"
: > "$OUT"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
nvm use 22
corepack enable
corepack prepare pnpm@10.14.0 --activate

run_one() {
  local name=$1
  local log="$REPO/.tmp-pipeline-$name.log"
  shift
  echo "======== $name ========" >> "$OUT"
  set +e
  "$@" > "$log" 2>&1
  local ec=$?
  set -e
  tail -n 15 "$log" >> "$OUT"
  echo "EXIT_CODE: $ec" >> "$OUT"
  echo "" >> "$OUT"
  return $ec
}

FAIL=0
run_one lint pnpm lint || FAIL=1
run_one typecheck pnpm typecheck || FAIL=1
run_one test pnpm test || FAIL=1
run_one build pnpm build || FAIL=1
echo "OVERALL_FAIL: $FAIL" >> "$OUT"
exit $FAIL
