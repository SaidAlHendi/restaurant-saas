# Milestone 1 — Monorepo scaffold (summary)

Branch: **`chore/scaffold`**. Roadmap item **1** only: workspace, local infra wiring, CI, health/readiness — **no product features** (no auth, catalog, orders, etc.).

This document records what was built, how the repo is laid out, and the decisions we locked in for the scaffold.

---

## Goals (what this milestone delivers)

| Delivered | Not in scope (later roadmap items) |
|-----------|-------------------------------------|
| pnpm + Turborepo monorepo | Auth, orgs, RLS, tenant tables |
| `apps/api` NestJS shell + `/v1/health` & `/v1/ready` | Business modules beyond empty shells |
| `apps/web` Vite SPA shell (RTK, router, i18n, PWA stub) | Dashboard / POS / KDS screens |
| `apps/site` React Router 7 SSR + prerender + sample menu route | Live public API menu |
| `packages/shared`, `packages/ui` (Button + themes), `packages/config` | Full UI kit batch (roadmap **1b**) |
| Docker Compose **optional** (Postgres dev + test + Redis) | Staging deploy |
| GitHub Actions: lint, typecheck, test, build | Playwright e2e |
| Drizzle init migration (empty of tenant tables) | Real schema / RLS policies |
| Jest e2e: health, ready, `withOrg` | Tenant-isolation suite |

---

## Architecture decisions

### NestJS major version: **11.2.7**

- **Chosen:** `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `@nestjs/testing` at **11.2.7**.
- **`@nestjs/terminus` 12.1.0** is used for health/readiness (supports Nest 11 and 12).
- **Why not Nest 12:** `nestjs-zod` peer dependencies allow **`@nestjs/common` ^10 || ^11 only**. Terminus and `nestjs-pino` support 12, but **nestjs-zod is the bottleneck**.

### Zod: **4.4.3** (catalog)

- Same version in API, web, and `@app/shared`.
- Supported by `nestjs-zod` (^3.25 || ^4) and `@hookform/resolvers` (^3.25 || ^4).

### Package manager

- **pnpm 10.14.0**, pinned via root `packageManager`.
- **pnpm catalog** in `pnpm-workspace.yaml` for shared pins: `react`, `react-dom`, `zod`, `typescript`, `vitest`, `tailwindcss`, `@tailwindcss/vite`.

### Workspace scope

- All internal packages use the **`@app/*`** scope (`@app/api`, `@app/web`, `@app/site`, `@app/shared`, `@app/ui`, `@app/eslint-config`, etc.).

### Local development process model

- **Single API process** with **`APP_ROLE=all`** (HTTP + worker context bootstrap in one Node process for now).
- **`pnpm dev`** runs **`turbo run dev --parallel`** (api, web, site).

### Ports (defaults)

| App / service | Port |
|---------------|------|
| API | 3000 |
| Web (Vite) | 5173 |
| Site (React Router dev) | 5174 |
| Postgres (dev) | 5432 |
| Postgres (test, repo compose) | 5433 |
| Redis | 6379 |

### Auth and guards (item 1)

- **Auth / permission guards exist as stub files only** — they are **not** registered globally in `CoreModule` (no accidental “always allow”).
- Stub guards **fail closed** (`canActivate` → `false`) if wired by mistake.

### Database seed

- **`pnpm db:seed`** is an intentional **no-op** script.

### CI vs local infra

- **CI only** in this milestone (no deploy workflow).
- **GitHub Actions:** one **Postgres** service mapped to host **5433**, plus **Redis** on 6379.
- **Local:** you may use the repo’s `docker-compose.yml` **or** an existing stack (e.g. `~/docker/local-db` with `postgres-dev` / `redis-dev`). Use **two databases** on the same Postgres instance if you only have port 5432: `restaurant_saas` and `restaurant_saas_test`. Set `DATABASE_URL` / `DATABASE_URL_TEST` in repo-root **`.env`** (see `.env.example` option B).

### Environment loading

- API **`loadEnv()`** (Zod-validated, single source for `process.env` in the API) loads repo-root **`.env`** via `dotenv` when running CLI scripts (`db:migrate`, Nest, etc.). Variables already set in the shell (tests, CI) are not overridden.

### Error shape (API)

- Global filter maps errors to [API conventions](./api-conventions.md):  
  `{ "error": { "code", "message", "details" } }`.

### Tenancy helper (scaffold)

- **`withOrg(db, orgId, fn)`** runs a Drizzle **transaction** and sets tenant context with  
  `SELECT set_config('app.org_id', $orgId, true)` (transaction-local, RLS-ready).
- E2e test: `apps/api/test/with-org.e2e-spec.ts`.

---

## Pinned / catalog versions (reference)

| Package | Version |
|---------|---------|
| pnpm | 10.14.0 |
| turbo (root) | 2.11.7 (installed) |
| typescript (catalog) | 5.8.3 |
| react / react-dom (catalog) | 19.1.0 |
| zod (catalog) | 4.4.3 |
| vitest (catalog) | 3.2.4 |
| tailwindcss / @tailwindcss/vite (catalog) | 4.1.11 |
| Nest core | 11.2.7 |
| @nestjs/terminus | 12.1.0 |
| nestjs-pino | ^4.4.0 |
| nestjs-zod | ^5.0.0 |
| drizzle-orm | ^0.44.4 |
| drizzle-kit | ^0.31.4 |

---

## Repository layout

```text
restaurant-saas/
├── .github/workflows/ci.yml
├── .env.example                 # copy to .env at repo root
├── docker-compose.yml           # optional local Postgres (5432), Postgres test (5433), Redis
├── package.json                 # root scripts → turbo
├── pnpm-workspace.yaml          # workspaces + catalog
├── turbo.json
├── README.md
├── docs/                        # product + architecture (incl. this file)
├── apps/
│   ├── api/
│   ├── web/
│   └── site/
└── packages/
    ├── config/
    │   ├── eslint-config/       # @app/eslint-config
    │   ├── typescript-config/   # @app/tsconfig (base, node, react, nest)
    │   └── prettier-config/     # @app/prettier-config
    ├── shared/                  # @app/shared — Zod schemas
    └── ui/                      # @app/ui — themes + shadcn Button
```

---

## `apps/api` (NestJS + Express)

Follows [backend-architecture.md](./backend-architecture.md). Two entry points: **`main.ts`** (HTTP + Socket.io gateway host), **`worker.ts`** / **`WorkerModule`** (jobs stub).

```text
apps/api/
├── drizzle/
│   ├── 0000_init.sql            # scaffold-only migration
│   └── meta/
├── drizzle.config.ts
├── src/
│   ├── main.ts
│   ├── worker.ts
│   ├── worker.bootstrap.ts      # worker context when APP_ROLE=all
│   ├── app.module.ts
│   ├── worker.module.ts
│   ├── config/
│   │   ├── env.ts               # Zod env (only API env reader)
│   │   ├── load-dotenv.ts       # loads repo-root .env
│   │   └── config.module.ts
│   ├── core/
│   │   ├── core.module.ts       # global filter, Zod pipe, db, logging, redis, realtime
│   │   ├── db/
│   │   │   ├── db.module.ts     # DRIZZLE + pg Pool
│   │   │   ├── with-org.ts
│   │   │   └── schema/          # empty export until milestone 2+
│   │   ├── auth/                # stubs — not registered globally
│   │   ├── context/             # RequestContext, @Ctx() stub
│   │   ├── permissions/         # decorators + guard stubs — not global
│   │   ├── errors/              # AppError + HttpExceptionFilter
│   │   ├── validation/          # re-exports nestjs-zod ZodValidationPipe
│   │   ├── logging/             # nestjs-pino, reqId, redaction
│   │   ├── redis/
│   │   ├── realtime/            # Socket.io gateway stub (/rt)
│   │   └── outbox/              # OutboxService stub
│   ├── modules/
│   │   ├── health/              # GET /v1/health, GET /v1/ready (Terminus + PG + Redis)
│   │   ├── identity/
│   │   ├── tenancy/
│   │   ├── catalog/
│   │   ├── ordering/
│   │   ├── kitchen/
│   │   ├── reporting/
│   │   ├── billing/
│   │   ├── notifications/
│   │   ├── admin/
│   │   └── public-menu/
│   ├── jobs/                    # outbox-publisher, aggregate-sales, queue — stubs
│   ├── lib/
│   └── scripts/
│       ├── migrate.ts
│       └── seed.ts              # no-op
└── test/
    ├── env.setup.ts             # DATABASE_URL_TEST, REDIS_URL for e2e
    ├── setup.ts                 # runs migrate before e2e
    ├── health.e2e-spec.ts       # /v1/health + /v1/ready
    └── with-org.e2e-spec.ts
```

**HTTP (item 1):**

- **`GET /v1/health`** — liveness (Terminus, no dependency checks).
- **`GET /v1/ready`** — Postgres `SELECT 1` + Redis `PING`.
- JSON logging via **nestjs-pino** with **request id** (`x-request-id` or generated).
- Global **Zod validation pipe** and **HTTP exception filter** (no business DTOs yet).

---

## `apps/web` (React + Vite SPA)

Follows [frontend-architecture.md](./frontend-architecture.md) at shell level.

```text
apps/web/src/
├── main.tsx                     # Redux Provider + RouterProvider + i18n
├── App.tsx                      # shell layout + @app/ui Button
├── App.test.tsx                 # smoke: RouterProvider + root heading
├── app/
│   ├── store.ts                 # RTK store + base API reducer
│   ├── router.tsx               # lazy areas: auth, dashboard, pos, kds, admin
│   └── api/
│       ├── base-api.ts
│       └── zod-response.ts
├── areas/                       # placeholder lazy route modules
├── lib/i18n.ts
├── locales/ar.json, en.json
└── styles/
```

- **vite-plugin-pwa** registered (minimal manifest).
- **Tailwind v4** via `@tailwindcss/vite`, styles from `@app/ui/globals.css`.

---

## `apps/site` (React Router 7 framework mode)

```text
apps/site/
├── react-router.config.ts       # ssr: true; prerender: /, /ar, /en
├── app/
│   ├── root.tsx                 # Layout, Meta, lang/dir loader stub
│   ├── routes.ts
│   ├── SiteRoot.test.tsx        # smoke: Layout + home route
│   ├── routes/
│   │   ├── home.tsx             # prerendered marketing home
│   │   ├── locale-home.tsx      # /ar, /en prerender
│   │   └── locale-menu.tsx      # /:locale/m/:orgSlug — static sample menu + meta + JSON-LD
│   └── lib/
│       ├── sample-menu.ts
│       └── seo.ts
```

- No Redux on site. Sample menu data is **static** (no public API yet).

---

## `packages/shared` (`@app/shared`)

- Zod schemas (e.g. health-related types for shared validation).
- Built with `tsc`; consumed by API and frontends.

---

## `packages/ui` (`@app/ui`)

Per [ui-kit.md](./ui-kit.md) — **first milestone slice only**:

- Existing **`src/styles/themes.css`** (cupcake / forest → shadcn tokens).
- **`src/styles/globals.css`** — Tailwind v4 + themes.
- **Button** component only (shadcn-style, `components.json` monorepo mode).
- Export: `@app/ui`, `@app/ui/globals.css`.

Roadmap **1b** adds the rest of the component batch and `/dev/ui` showcase.

---

## `packages/config`

| Package | Purpose |
|---------|---------|
| `@app/eslint-config` | Flat ESLint 9 — base, node, react, nest |
| `@app/typescript-config` | Strict TS configs for apps/packages |
| `@app/prettier-config` | Shared Prettier |

---

## Root scripts

| Script | Action |
|--------|--------|
| `pnpm dev` | Turbo parallel dev (api, web, site) |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` | ESLint across workspace |
| `pnpm typecheck` | `tsc --noEmit` per package |
| `pnpm test` | Unit + e2e (api), Vitest (web, site) |
| `pnpm db:generate` | Drizzle generate (`@app/api`) |
| `pnpm db:migrate` | Apply migrations (`@app/api`) |
| `pnpm db:seed` | No-op |

Quality gate before calling work “done”: **`pnpm lint && pnpm typecheck && pnpm test`** (and **`pnpm build`** for releases).

---

## Tests (scaffold)

| App | Runner | What |
|-----|--------|------|
| API | Jest + Supertest | E2e `AppModule`: `/v1/health`, `/v1/ready`; `withOrg` sets `app.org_id` |
| Web | Vitest + Testing Library | Renders app shell via router (heading visible) |
| Site | Vitest + Testing Library | Renders `Layout` + home route |

E2e uses **`DATABASE_URL_TEST`** (default in test setup: Postgres on **5433** unless overridden in `.env`).

---

## CI (`.github/workflows/ci.yml`)

On push/PR to `main`:

1. pnpm 10.14, Node 22, pnpm cache  
2. Services: Postgres **5433**, Redis **6379**  
3. `pnpm install` → `pnpm db:migrate` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`  

No deploy job in milestone 1.

---

## Local setup checklist

1. **Node 22+** (or 20 LTS) and **pnpm 10** (`corepack enable`).
2. **`cp .env.example .env`** at repo root; set URLs for your Postgres/Redis.
3. Create DBs: `restaurant_saas`, `restaurant_saas_test`.
4. **`pnpm install`**
5. **`pnpm db:migrate`**
6. **`pnpm dev`** → API http://localhost:3000, web :5173, site :5174.
7. Verify: `curl http://localhost:3000/v1/ready`

Example `.env` when using external Postgres (`postgres` / `rootpass` on 5432):

```env
DATABASE_URL=postgresql://postgres:rootpass@localhost:5432/restaurant_saas
DATABASE_URL_TEST=postgresql://postgres:rootpass@localhost:5432/restaurant_saas_test
REDIS_URL=redis://localhost:6379
APP_ROLE=all
PORT=3000
VITE_API_URL=http://localhost:3000
```

---

## Docs and rules (context)

- Product and architecture: `docs/product.md`, `docs/architecture.md`, `docs/backend-architecture.md`, `docs/frontend-architecture.md`, `docs/api-conventions.md`, `docs/data-model.md`, `docs/ui-kit.md`, `docs/roadmap.md`.
- Agent rules: `.cursor/rules/00-core.mdc`, `AGENTS.md`.

---

## Known follow-ups (not blockers for “scaffold done”)

- Wire **`Layout`** `<html lang dir>` from route loader data on site (loader already computes locale).
- Register **OutboxService** in `CoreModule` when ordering/outbox land.
- **ESLint UI-only rule** for feature `.tsx` — roadmap **1b**.
- **Sentry**, **Swagger** `/v1/docs`, **pg-boss** worker loop — later milestones.
- Commit **`pnpm-lock.yaml`** after install; run full **`lint / typecheck / test / build`** locally and fix any drift.

---

## What we explicitly did **not** build

- Users, orgs, branches, memberships, RLS policies, catalog, orders, billing, notifications, admin APIs, public menu API, cashier/KDS/dashboard UIs, Playwright, staging deploy, or any entitlements/permissions enforcement on routes.

Next roadmap item: **2 — Auth, organizations, branches, memberships, roles, RLS, tenant-isolation tests.**
