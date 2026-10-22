# Sahtain

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

# e2e uses restaurant_saas_test — migrate + seed once (global-setup runs these on every test run):
DATABASE_MIGRATION_URL=postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas_test \
DATABASE_URL=postgresql://app_user:app_user_dev@localhost:5432/restaurant_saas_test \
  pnpm db:migrate && pnpm db:seed

# If e2e migrate fails with "already exists", reset the test schema then migrate + seed:
DATABASE_MIGRATION_URL=postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas_test \
  pnpm db:reset-test && pnpm db:migrate && pnpm db:seed

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
pnpm db:seed:demo          # large demo tenants (seed-* slugs), optional order history
pnpm db:seed:images        # fetch Unsplash metadata (developer machine; needs UNSPLASH_ACCESS_KEY)
```

## Demo data (`pnpm db:seed:demo`)

Separate from **`pnpm db:seed`** (fixed `demo` / `other` orgs for tests). Demo seed creates four bilingual restaurants (`seed-bait-shami`, `seed-burger-lab`, `seed-cafe-qahwa`, `seed-pizza-forno`) with catalog, staff, tables, and order history.

```bash
# Full reset of seed-* orgs + re-seed (safe for local DB only; refuses NODE_ENV=production)
pnpm db:seed:demo --reset --images=off --days=30

# Smaller history (CI uses --days=2)
pnpm db:seed:demo --images=off --days=2

# Fixed anchor for reproducible rows (that date at 22:30 Riyadh time; default anchor = now,
# nothing is ever written after the anchor and a few orders are still open in the kitchen)
pnpm db:seed:demo --reset --anchor=2026-10-11 --images=off --days=7

# Product photos: commit unsplash-photos.json via db:seed:images, then upload from cache
pnpm db:seed:images          # needs UNSPLASH_ACCESS_KEY in .env (see .env.example)
pnpm db:seed:demo --images=on
```

**Logins** (password = `SEED_PASSWORD` from `.env`):

| Org slug | Owner | Manager | Cashiers / kitchen |
|----------|-------|---------|-------------------|
| `seed-bait-shami` | `owner1@seed-bait-shami.seed.local` | `manager1@…` | `cashier1`…`cashier6`, `kitchen1`…`kitchen3` |
| `seed-burger-lab` | `owner1@seed-burger-lab.seed.local` | … | 2 branches |
| `seed-cafe-qahwa` | `owner1@seed-cafe-qahwa.seed.local` | … | 3 branches |
| `seed-pizza-forno` | `owner1@seed-pizza-forno.seed.local` | … | 2 branches |

Email pattern: `{role}{n}@{org-slug}.seed.local`.

**Unsplash:** create an app at [unsplash.com/oauth/applications](https://unsplash.com/oauth/applications), add `UNSPLASH_ACCESS_KEY` to `.env`, run `pnpm db:seed:images` (rate-limited; re-run to continue). Credits land in `docs/seed-image-credits.md`.

**Checks:** every run ends with invariants (totals, payment status, business date, no future timestamps, image files) and exits 1 on failure. `data/data.spec.ts` keeps the menus Arabic-script only and at least 8 dishes per category.

**Coverage:** `apps/api/src/scripts/seed-demo/coverage.spec.ts` fails if a Drizzle table is missing from `SEED_COVERAGE` (see `.cursor/rules/21-seed-data.mdc`).

## Docs

See `docs/` for product, architecture, API conventions, data model, and roadmap.

**Milestone 1 (scaffold):** [docs/scaffold-milestone.md](docs/scaffold-milestone.md)
