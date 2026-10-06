# Restaurant SaaS

Multi-tenant SaaS for restaurants: public digital menu, cashier (POS), kitchen display (KDS), owner dashboard, reports, and subscriptions.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **API:** NestJS, Drizzle ORM, PostgreSQL, Redis, Socket.io
- **Web:** React + Vite SPA (dashboard, POS, KDS, admin)
- **Site:** React Router framework mode (SSR + prerender for SEO)
- **Shared:** `@app/shared` (Zod schemas), `@app/ui` (shadcn/ui + Tailwind v4)

## Prerequisites

- Node.js 22+
- pnpm 10 (`corepack enable`)
- Docker (Postgres + Redis)

## Quick start

**Postgres + Redis** — either use the repo’s `docker compose up -d`, or your own stack on
`localhost:5432` / `6379` (for example `~/docker/local-db`). Create databases `restaurant_saas`
and `restaurant_saas_test`, then set `DATABASE_URL` / `DATABASE_URL_TEST` in `.env` (see
`.env.example` option B for `postgres` / `rootpass`).

```bash
cp .env.example .env
# optional if you do not already have Postgres/Redis:
# docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

Create databases on an existing Postgres (once):

```bash
docker exec -it postgres-dev psql -U postgres -c "CREATE DATABASE restaurant_saas;"
docker exec -it postgres-dev psql -U postgres -c "CREATE DATABASE restaurant_saas_test;"
```

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Web | http://localhost:5173 |
| Site | http://localhost:5174 |

Health checks: `GET /v1/health`, `GET /v1/ready`.

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate   # Drizzle migration from schema changes
pnpm db:migrate
pnpm db:seed       # no-op in scaffold milestone
```

## Docs

See `docs/` for product, architecture, API conventions, data model, and roadmap.

**Milestone 1 (this scaffold):** [docs/scaffold-milestone.md](docs/scaffold-milestone.md) — structure, decisions, and what was built.
