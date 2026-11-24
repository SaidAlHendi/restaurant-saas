# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged. Menu look complete.
- **Last task:** removed all cursor paging and "Load more". Orders, products, `/v1/admin/users` and `/v1/admin/audit` now take `?page=&pageSize=` (defaults 1 / 10, max 100) and return `{ items, page, pageSize, total }`. No `limit`/`offset`/`perPage` anywhere: callers must send `pageSize` (a stray `limit` is ignored, so the default 10 applies).
- **How it works:** `pagedListQuerySchema` (always paged) beside the opt-in `pageQuerySchema` in `packages/shared/src/page-pagination.ts`. Repos have `listX` + `countListedX` sharing one condition builder. Web: `lib/pagination.ts` (`listPaginationLabels`, `pageCountOf`) + `NumberedPagination` from `@app/ui` on dashboard orders, POS orders and products. Admin: `lib/AdminPagination.tsx` on Users and Audit. Realtime events refetch the current page instead of jumping to page 1.
- **Changed files:** shared (`page-pagination.ts`, `catalog/product.ts`, `orders/order.ts`, `admin/directory.ts`, index; `catalog/pagination.ts` deleted), api (products/ordering/admin users+audit services and repos; `lib/cursor.ts`, `lib/order-list-cursor.ts` deleted; e2e specs), web (orders, pos, menu hooks and views, `lib/pagination.ts`, en/ar locales; `CursorPagination`/`BoxedPagination` removed from `@app/ui` and dev-ui), admin (users, audit, restaurants on `AdminPagination`; `CursorPager`, `use-cursor-pages` deleted), docs, CHANGELOG.
- **Next steps:** not clicked in a browser: check the pager on Orders, POS orders, Products, admin Users/Audit in ar (RTL) and en.
- **Gotchas:** after shared changes run `pnpm --filter @app/shared build`. e2e: `TS_NODE_PROJECT=./test/tsconfig.e2e.json pnpm exec jest --config test/jest-e2e.config.ts <name>` from `apps/api`. Root `.env` has CRLF. Migration `0024` does not exist.

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
