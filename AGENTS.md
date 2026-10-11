# AGENTS.md

Project rules live in `.cursor/rules/` (core rules in `00-core.mdc`; ESLint in `46-eslint-strict-typescript.mdc`; TypeScript in `47-typescript-typecheck.mdc`; verify loop in `48-agent-verify-loop.mdc`; REST API doc sync in `49-rest-api-reference.mdc`) and product/technical docs in `docs/`.
Read `docs/product.md`, `docs/architecture.md`, `docs/backend-architecture.md`, `docs/frontend-architecture.md`, `docs/ui-kit.md`, `docs/data-model.md`, `docs/api-conventions.md`, `docs/rest-api-reference.md` and `docs/roadmap.md` before non-trivial work.
When adding or changing HTTP endpoints or shared API Zod schemas, update `docs/rest-api-reference.md` in the same PR (see `49-rest-api-reference.mdc`).
Before saying a task is done: `pnpm lint && pnpm typecheck && pnpm test` must pass.
