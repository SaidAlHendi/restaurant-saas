# Session rules (keep sessions small: the whole context is re-read every turn)
1. One session = one task. Brainstorming happens outside Claude Code.
2. Plans live in files (`docs/roadmap.md`, `docs/<topic>.md`), never only in chat.
3. Start by reading `## Status` in `docs/roadmap.md`, not by re-exploring the repo.
   End by rewriting it (max 30 lines): state, changed files, next step, decisions, gotchas.
4. Read surgically: rg/grep, then only the relevant lines. Limit command output
   (head/tail, quiet flags), run only the relevant tests, answer concisely, show diffs only.
5. Broad repo scans go to a subagent (Explore) that returns conclusions + paths only.
   Put rules 4 and 6 in its prompt.
6. Code navigation: if `graphify-out/graph.json` exists, use `graphify query|path|explain`
   for "where is X / what calls Y / what breaks if I change Z". Use grep when you know the
   exact string or file. No graph (e.g. cloud sessions)? Use grep. After code changes run
   `graphify update .` if installed. Read GRAPH_REPORT.md only for architecture reviews.
7. Docs vs code: code and migrations are the source of truth. If docs disagree, flag it
   and fix the docs in the same task.
8. Never search or read the `sahtain-design` repo unless Said explicitly says so in that session.

# Where to look (paths only)
- Current state / next step → `docs/roadmap.md` (`## Status`)
- Product, roles → `docs/product.md` · Architecture → `docs/architecture.md`
- Backend, auth, RLS → `docs/backend-architecture.md` · DB → `docs/data-model.md`
- API → `docs/api-conventions.md` · Frontend → `docs/frontend-architecture.md`
- UI kit → `docs/ui-kit.md` · Env → `docs/env-explained.md` · Staging → `docs/runbook-staging.md`
- Coding rules → `.cursor/rules/*.mdc` · Done gate: `pnpm lint && pnpm typecheck && pnpm test`
- Published docs (auth, roles/permissions, DB) are Mintlify, not in this repo
  (workspace `alhendi-media`, branch `main`). Read the page with the Mintlify
  `read`/`search` tools instead of exploring code. Update the matching page when
  behavior changes; publish only with Said's OK.
