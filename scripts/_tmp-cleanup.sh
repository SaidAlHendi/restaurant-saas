#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
git rm -f .commit-msg.tmp scripts/agent-commit-push.sh 2>/dev/null || true
git add -A
printf '%s\n' 'chore: remove accidental commit helper files' > /tmp/cleanup-msg.txt
git commit -F /tmp/cleanup-msg.txt
git push origin feat/staff-settings
