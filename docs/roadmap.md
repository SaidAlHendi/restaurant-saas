# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task:** E2E report suite (`scripts/e2e-report/`, PR #96) plus the fixes it found: live `data.changed` pushes for settings/branch/tables/staff/devices/plan, instant plan cache drop, suspend closes sockets, 413 instead of 500 on oversized bodies, polling removed.
- **How it works:** `@NotifyChange(scope)` on a write endpoint -> `NotifyChangeInterceptor` -> `DataChangedNotifier` writes an outbox row per branch -> socket `data.changed`. Web: `useAppLiveSync` in `AppShellLayout` maps scope -> RTK tags. Details in `docs/api-conventions.md` (Realtime).
- **Changed files:** shared `realtime/data-changed.ts`; api `core/realtime/*` (decorator, interceptor, notifier, module, org room), write controllers, billing services, 413 filter; web `features/realtime/*`, `lib/realtime.ts`, billing/devices hooks; e2e tests 14-15.
- **Polling left:** POS offline fallback (60 s, only while socket is down), anonymous Ready screen (4 s, no socket for public tokens). Clock/lock timers are not data polling. Admin app: none.
- **Next steps:** Ready screen over a public socket; audit log for permission changes; Cloudflare Workers Builds failure on PR #96 is unrelated.
- **Gotchas:** after shared changes run `pnpm --filter @app/shared build` (and `@app/ui` build before web tsc). e2e: needs redis + postgres + API on :3000; `node scripts/e2e-report/run.mjs [filter]` (browser tests need web on :5173). Root `.env` has CRLF.

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
