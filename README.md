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
- **PostgreSQL + Redis** on your machine (see below)

## Local Postgres + Redis

You can use either setup below (not both on the same ports).

### Option A — shared local Postgres (recommended)

Use an **existing** stack so this repo does not start duplicate containers on `5432` / `6379`.

Example: `~/docker/local-db` with `postgres-dev` and `redis-dev` already running:

```bash
docker compose ps   # in ~/docker/local-db — postgres on 5432, redis on 6379
```

**One-time database setup** from this repo:

```bash
cp .env.example .env
chmod +x scripts/bootstrap-postgres.sh
POSTGRES_PASSWORD=your-postgres-password ./scripts/bootstrap-postgres.sh
# optional: POSTGRES_CONTAINER=... POSTGRES_USER=... POSTGRES_HOST=... POSTGRES_PORT=...
```

That creates `restaurant_saas` and `restaurant_saas_test` and applies `infra/postgres/init/01-roles.sql` to each.

### Option B — bundled compose profile

If you do not have a shared Postgres yet:

```bash
docker compose --profile bundled up -d
```

Then point `.env` at the bundled URLs from `.env.example` (Postgres on **5432**, test DB on **5433** in CI; bundled layout may differ — see `docker-compose.yml`).

Then:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed          # demo/other orgs (uses DATABASE_URL → restaurant_saas)

# e2e uses restaurant_saas_test — migrate + seed once:
DATABASE_MIGRATION_URL=postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas_test \
DATABASE_URL=postgresql://app_user:app_user_dev@localhost:5432/restaurant_saas_test \
  pnpm db:migrate && pnpm db:seed

pnpm dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Web | http://localhost:5173 |
| Site | http://localhost:5174 |

Health checks: `GET /v1/health`, `GET /v1/ready`.

CI uses its own GitHub Actions Postgres service (port 5433); that is unrelated to your local `postgres-dev`.

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate   # Drizzle migration from schema changes
pnpm db:migrate
pnpm db:seed
```

## Docs

See `docs/` for product, architecture, API conventions, data model, and roadmap.

**Milestone 1 (scaffold):** [docs/scaffold-milestone.md](docs/scaffold-milestone.md)
