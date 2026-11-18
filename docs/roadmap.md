# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task (uncommitted, branch dev):** pay-before-send for additions (plan: `docs/pay-before-send-additions.md`). With payBeforeSend on, additions to a sent order are saved as item status `awaiting_payment` (hidden from KDS) and released when the order is paid in full; add mode button is "Pay & send additions", ticket prints and toast shows on release; held lines show an "Awaiting payment" badge. New migration 0025 (enum value). Earlier commit da80223: /pos add mode flow.
- **Changed files:** api ordering.service/repository, schema + drizzle/0025 + journal, shared enums/order-totals, web pos hooks/components, locales, docs (data-model, architecture, docs-site ordering.mdx), cashier e2e tests.
- **Verified:** lint/typecheck/test green (api 137 unit + 360 e2e, web 323); clicked through: cancel dialog keeps item held and off KDS, paying from sheet releases it, ticket + toast.
- **Next step:** staging deploy / Step 10b.
- **Decisions:** printed ticket = exactly the items just sent (diff before/after), no stored "printed" state. Reprint-additions button dropped; full "Kitchen ticket" in More is the fallback.
- **Gotchas:** a held addition on an order that reaches Ready/Completed is released as pending when paid (edge case, not handled). print() blocks a headless browser, stub it when testing. `graphify-out/` is gitignored. Left alone: drizzle 0024_*, .gitignore, test.md.

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
