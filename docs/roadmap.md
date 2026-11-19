# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task:** Order details redesign, UI only (branch `feat/order-details-redesign`). One shared set of views under `apps/web/src/features/orders/components/order-details/` (model builder, header + stepper, cards body) used by the POS sheet and the dashboard order page. POS footer: one big primary action per status, secondary row, More menu (print, Manager > Reopen, red Cancel). Dashboard page stays read-only.
- **Changed files:** web `order-details/*` (new), `PosOrderDetailSheetView`, `use-pos-order-detail`, `DashboardOrderDetailView`, `use-dashboard-order-detail-page`, `order-event-timeline.utils` (reopen/undo/handover labels + reason), `pos-order-detail.utils` (`posDetailActionLayout`), locales en/ar (`orderDetails.*`); docs-site cashier + owner, CHANGELOG.
- **Verified:** lint, typecheck, web + ui tests green. Clicked in headless Chromium (demo org, owner login) on the dashboard page and POS sheet in EN + AR, light + dark, for placed, preparing, ready, completed, cancelled; More menu with Manager > Reopen in AR. Not clicked: draft, seats, pager (branch has pagers off), display currency, voided line, Undo toast (covered by unit/component tests only). Mintlify not published.
- **Next step:** review the PR; click the not-clicked cases above on staging.
- **Decisions:** UI shows Mark ready next to Start preparing on a New order (server already allows placed -> ready). Add items stays as today (placed/preparing only). Timeline loads lazily in the POS sheet. Moving an order to a table lives on the Bills page, not the sheet, so it is untouched.
- **Gotchas:** root `.env` has CRLF line endings (strip `\r` when reading values in scripts). Not in the API, so not shown: bill label, branch name on the detail, payment status (captured/refunded) and who took a payment, which items a payment covered, table label on the dashboard page.

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
