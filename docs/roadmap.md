# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged. Menu look complete.
- **Last task:** "Soon" labels on plans. All four plans list their full services (landing, Billing page, docs-site); unbuilt ones show Soon / قريباً. No enforcement, price or seed change.
- **How it works:** single source `packages/shared/src/billing/soon-features.ts` (`SOON_FEATURE_KEYS`, `isFeatureSoon`). Unbuilt: `limit.devices_per_branch`, `branches.multi`, `roles.custom`, `reports.advanced`, `reports.export`, `ordering.table_qr`, `api.access`. API spec `soon-features.spec.ts` fails if one is used in `@RequireFeature` / `.can` / `assertFeature`: remove the key from the list when the feature ships. Landing plan lines are `{text, key?}`, badge comes from the key; FAQ multi-branch answer now says coming soon.
- **Changed files:** shared (`soon-features.ts`+test, index), api spec, site landing (`content/*.ts`, `types.ts`, `landing.utils.ts`+test, `PlansSection`, `InnerPages`), web billing (`use-billing-page.ts`, `BillingPageView.tsx`, en/ar locales), `docs-site/subscriptions/plans.mdx`, CHANGELOG.
- **Next steps:** none open. Not clicked in a browser: check Billing cards and landing /plans in ar (RTL) and en at 390/1440px. The landing "All your branches in one dashboard" tile still reads as available; decide if it needs a Soon note.
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
