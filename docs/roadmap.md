# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task:** Order handover review fixes (branch `feat/order-handover`): Today-only switch on POS Orders (`?today=1|0`, API `hiddenOlderCount`), Ready on a New order (`placed -> ready`), table header + loading state on the handover button, undo restores item progress and is refused after the table bill closes, fake-clock e2e (no real waits).
- **Changed files:** api `ordering.service.ts`, `ordering.repository.ts`, `state-machine.ts`, `test/create-test-app.ts` (optional clock), `ordering-handover.e2e-spec.ts`; shared `orderListResponseSchema`; web POS orders hook/view/utils, KDS utils, locales en/ar; docs-site cashier/kitchen, CHANGELOG.
- **Verified:** lint, typecheck, api unit, web tests, ordering/kitchen e2e green. Not clicked through in a browser again. Mintlify not published.
- **Next step:** merge the PR to `dev`, then staging deploy / Step 10b. Open question for the PR: Active list went empty with 401s after Undo (needs a repro on `dev`).
- **Decisions:** Undo of Ready always returns to `preparing` (also from `placed`); items that were open at Ready go back to preparing, items ticked earlier stay ready. Undo of a handover is refused (`ORDER_UNDO_BILL_CLOSED`, 422) once the table bill is closed. Undo by another user is `ORDER_UNDO_EXPIRED`.
- **Gotchas:** Today-only defaults to OFF on Active, Awaiting payment and Ready, ON on Completed, Cancelled and All today. The `hiddenOlderCount` is skipped when searching. Earlier gotchas still apply (display config needs `org.manage`; held additions on Ready/Completed orders; `graphify-out/` gitignored).

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
