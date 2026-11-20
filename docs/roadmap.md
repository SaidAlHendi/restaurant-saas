# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task:** per-branch order types (`supports_dine_in`, `supports_takeaway`, migration `0027_branch_order_types`, default both true, CHECK at least one). Server: order create rejects an unsupported type (`ORDER_TYPE_NOT_SUPPORTED`), table create and QR rotate refused when dine-in is off, PATCH refuses both off (`ORDER_TYPE_REQUIRED`) and turning a type off with open orders (`ORDER_TYPE_HAS_OPEN_ORDERS`). Web: two switches in Branch settings, POS shows only the supported type and resets a stale cart type. Plan: `~/.claude/plans/make-the-plan-zazzy-nygaard.md`.
- **Changed files:** `apps/api/drizzle/0027_*`, `tenancy.ts` schema, `packages/shared` branch + pos-menu schemas, `branches.service.ts`, `tenancy.repository.ts`, `ordering.service.ts`, `tables.service.ts`, `pos-menu.service.ts`, web settings hook/view, `use-pos-page.ts`, `PosPageView.tsx`, `use-app-shell.ts` (nav), `MenuRoutes.tsx`/`PosArea.tsx` (route guards), dashboard orders type filter, `/me` branches, locales, `test/branch-order-types.e2e-spec.ts`, docs, CHANGELOG.
- **Verified:** typecheck green (api, web); new e2e (5 tests) and web settings tests pass. lint, typecheck, web and api unit tests green. Not clicked in a browser.
- **Next step:** review the PR; click it on staging (owner turns dine-in off: POS shows takeaway only, Tables/QR/Bills hidden; turn takeaway off; try both off). Optional: make the public QR page 404 when dine-in is off.
- **Decisions:** flags live on the branch, no plan gating, no new permission (`branches.manage`). Public QR/table resolve is unchanged (menu only) for now. Tables data is kept when dine-in is off.
- **Gotchas:** migration `0024` does not exist (journal goes 0023 -> 0025); next was 0027. Root `.env` has CRLF line endings. e2e: `TS_NODE_PROJECT=./test/tsconfig.e2e.json pnpm exec jest --config test/jest-e2e.config.ts <name>` from `apps/api`.

- [x] 1. Monorepo scaffold, docker compose (Postgres, Redis), CI (lint, typecheck, test), deploy to staging
- [x] 1b. UI kit in packages/ui: shadcn/ui + Tailwind v4, themes cupcake/forest, first batch of components, /dev/ui showcase, ESLint UI-only rule (docs/ui-kit.md)
- [x] 2. Auth, organizations, branches, memberships, roles, RLS, tenant-isolation test suite
- [x] 3. Catalog: categories, products, modifiers, images (resize to WebP), ar/en translations
- [x] 4. Public menu page (cached at CDN) + QR codes
- [x] 5. Order model: tables, state machine, counters, idempotency, events, outbox
- [x] 6. Cashier PWA: create order, modifiers, dine-in/takeaway, table, notes, tax, payment, print
- [x] 7. Kitchen display: realtime, sound, age timer, status changes, resync on reconnect
- [x] 7b. Demo seed data
- [x] 7c. Cashier flow: pay before send, branch payment settings, POS orders page
- [x] 8. Owner dashboard: current/past orders, search, filters, details, today's report
- [x] 9. Staff and Settings: one dashboard Settings area with tabs Restaurant (name, logo, languages, tax), Branch (details, receipt header/footer, business day start, payment settings from 7c) and Staff & roles (owner/manager/cashier/kitchen, invite, PIN login, manager approval for cancel)
- [ ] 10. Billing: plans as data, 14-day trial, Paddle webhooks, entitlements; Sentry, uptime, backup restore test
- [ ] 11. Pilot in one real restaurant for a full weekend
- [ ] 12. Platform admin dashboard (internal, for us not tenants):
  - New `apps/admin` Vite app in the monorepo, same pattern as `apps/web`
  - New NestJS module `/v1/admin/*` guarded by a `platform_admin` role; uses the `app_owner` DB role to bypass tenant RLS, with every admin action audit-logged
  - Tenant list: organization, plan, status, branch count
  - Suspend and reactivate a tenant
  - Impersonate a tenant for support (time-limited, audit-logged)
  - Billing overview: MRR and churn
  - Paddle subscription override
  - Feature flags per tenant

# Phase 2
- [ ] Shifts and cash close, discounts, refunds
- [ ] Offline queue for cashier
- [ ] Daily summary email/WhatsApp to owner
