#!/usr/bin/env bash
set -euo pipefail
source "$HOME/.nvm/nvm.sh"
nvm use 22
cd "$(dirname "$0")/.."
pnpm lint && pnpm typecheck && pnpm test && pnpm build
