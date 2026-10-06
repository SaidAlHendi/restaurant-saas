# Roadmap (MVP)

- [ ] 1. Monorepo scaffold, docker compose (Postgres, Redis), CI (lint, typecheck, test), deploy to staging
- [ ] 1b. UI kit in packages/ui: shadcn/ui + Tailwind v4, themes cupcake/forest, first batch of components, /dev/ui showcase, ESLint UI-only rule (docs/ui-kit.md)
- [ ] 2. Auth, organizations, branches, memberships, roles, RLS, tenant-isolation test suite
- [ ] 3. Catalog: categories, products, modifiers, images (resize to WebP), ar/en translations
- [ ] 4. Public menu page (cached at CDN) + QR codes
- [ ] 5. Order model: tables, state machine, counters, idempotency, events, outbox
- [ ] 6. Cashier PWA: create order, modifiers, dine-in/takeaway, table, notes, tax, payment, print
- [ ] 7. Kitchen display: realtime, sound, age timer, status changes, resync on reconnect
- [ ] 8. Owner dashboard: current/past orders, search, filters, details, today's report
- [ ] 9. Staff: owner/cashier/kitchen roles, PIN login, manager approval for cancel
- [ ] 10. Billing: plans as data, 14-day trial, Paddle webhooks, entitlements; Sentry, uptime, backup restore test
- [ ] 11. Pilot in one real restaurant for a full weekend

# Phase 2
- [ ] Shifts and cash close, discounts, refunds
- [ ] Offline queue for cashier
- [ ] Daily summary email/WhatsApp to owner
