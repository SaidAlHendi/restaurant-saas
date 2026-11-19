# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task:** Order handover (branch `feat/order-handover`): removed auto-complete; cashier taps Picked up / Served (ready -> completed, needs paid, else payment opens first); KDS has no Start (first item tick -> preparing) and a 5 s Undo after Ready; POS 10 s Undo after handover.
- **Changed files:** api `ordering.service.ts`, `state-machine.ts` (undo transitions), shared `changeOrderStatusBodySchema` (`undo`), e2e `ordering-handover`, `ordering-payments` (reverted edits), `kitchen-board`; web `use-pos-handover.ts`, POS detail/orders hooks and views, KDS hook/utils, locales en/ar; docs-site cashier/kitchen/owner, `docs/product.md`, `docs/data-model.md`, CHANGELOG.
- **Verified:** api unit + ordering/kitchen/pager/public-menu e2e green; web tsc and vitest green. Not clicked through in a browser. Mintlify not published.
- **Next step:** review/merge PR to dev, then staging deploy / Step 10b.
- **Decisions:** reused `/status` + `orders.update_status` (body `undo: true`); handover event payload `handover: true`; undo window 15 s server-side (actor of last status event); error `ORDER_UNDO_EXPIRED` (422). Cashier sheet still has manual Start preparing / Mark ready.
- **Gotchas:** Open review findings in `docs/order-handover.md`. Un-ticking an item never moves an order back to placed. Follow-ups: Reopen/Recall for old completed orders, optional 15-min auto-complete, permissions UI. The diagram `/mnt/project-files/diagrams/takeaway-order-example.png` was not available. Earlier gotchas still apply (display config needs `org.manage`; held additions on Ready/Completed orders; `graphify-out/` gitignored).

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
