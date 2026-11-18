# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task:** Notion "wrong price unit in adding product". Products table showed `product.currency` (e.g. USD) while the form showed the base currency (SAR). Table now shows the system price in `org.defaultCurrency`, plus the converted display price (`SAR 100 · $26.67`) when a display currency is active and differs. Empty states for dependent catalog pages were committed earlier (b8ae0d8).
- **Changed files:** web menu `use-products-screen.ts`, `docs-site/roles/owner.mdx`.
- **Verified:** typecheck, eslint, menu + money tests green. Not clicked through in a browser.
- **Next step:** staging deploy / Step 10b.
- **Decisions:** read-only users get plain text ("ask a manager or the owner"), no button. Tables and QR check `branches.manage`, menu pages `menu.manage`, left as is.
- **Gotchas:** display config comes from `GET /v1/org/settings` (`org.manage`), so `menu.manage`-only users see just the system price in the products table. `productDisplayCurrency` in `lib/money.ts` is now unused outside its test. QR empty state has no "Add tables" button (string `menu.qr.noTablesAction` exists, unused). A held addition on an order that reaches Ready/Completed is released as pending when paid (not handled). print() blocks a headless browser. `graphify-out/` is gitignored.

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
