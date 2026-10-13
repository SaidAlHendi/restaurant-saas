#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
git add -A
git commit -F .commit-msg.tmp
git push origin feat/staff-settings
