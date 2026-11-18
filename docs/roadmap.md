# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task (committed da80223 on dev):** POS add-items flow redone. `/pos?addTo=<orderId>` add mode: cart panel shows only new lines, one "Send to kitchen (N)" button saves and prints an additions ticket (device switch "Print kitchen ticket", `localStorage pos.printAdditions`). Order sheet is Pay / Mark ready / Add items / More (Receipt, Kitchen ticket, Cancel). Removed "Kitchen additions" button and the sessionStorage printed-ids memory.
- **Changed files:** apps/web/src/features/pos/{hooks/use-pos-page.ts,use-pos-order-detail.ts,use-pos-orders-page.ts,components/PosPageView.tsx,PosOrderDetailSheetView.tsx,pos-print-pref.ts}, lib/print/kitchen-addition-diff(.test).ts, locales en/ar, docs/product.md.
- **Verified:** pnpm lint/typecheck/test pass; clicked through at 1024x768 EN + AR RTL (add, send+print, skip print, Orders-page entry, Back, invalid id).
- **Next step:** staging deploy / Step 10b.
- **Decisions:** printed ticket = exactly the items just sent (diff before/after), no stored "printed" state. Reprint-additions button dropped; full "Kitchen ticket" in More is the fallback.
- **Gotchas:** print() blocks a headless browser, stub it when testing. `graphify-out/` is gitignored. Left alone: drizzle 0024_*, .gitignore, test.md.

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
