# Roadmap (MVP)

## Status
Rewrite this section at the end of every session (max 30 lines).
- **State:** Steps 1-9 done. 10a done; 10b (Sentry, uptime, backup restore test) open, staging deploy in progress (`docs/runbook-staging.md`). Step 12 (admin) 12a-12d merged.
- **Last task:** themeable public QR menu, step 3b: plan gating and brand colour. Menu look is now complete.
- **How it works:** gate = existing feature `menu.branding` (Menu, Restaurant, Business, trial; not Free). Server: `PATCH menuTheme` with a non-default look and `POST /v1/org/menu-cover` return 403 `MENU_THEME_NOT_IN_PLAN` on Free (saving the default look and removing the cover still work). Settings GET has `menuLookAllowed`. Public menu serves `effectiveMenuTheme` (default look, no cover, when not allowed) computed per request, so plan changes need no manual purge; the saved theme/cover are never deleted. Brand colour: `theme.brandColor` (#rrggbb, stored as typed); `packages/shared/public-menu/brand-color.ts` (`resolveBrandColor`: 3:1 vs preset background, darken/lighten only; text 4.5:1) and `menuThemeVars` feed both site and dashboard preview. Dashboard: read-only fieldset + banner naming the unlocking plan on Free; colour picker with "Adjusted for readability".
- **Changed files:** shared (`brand-color.ts`+test, `menu-theme.ts`+test, `settings.ts`, index), `org-settings.service.ts` (gate, `MENU_LOOK_FEATURE`), `public-menu.service.ts`, web settings (utils, hook, view, preview, tests), `show-api-error.ts`, locales, site `menu-theme.ts`+test, e2e `menu-theme` and `billing-2b` (webhook plan switch), docs (`data-model`, `api-conventions`, docs-site plans/menu-look/owner), CHANGELOG.
- **Decisions:** menu look is per organization (not per branch); gate reuses `menu.branding`, no new feature key; trial gets the full look; failing brand colours are auto-corrected, not rejected (3:1 vs background, 4.5:1 text on colour). Free owners can still remove a saved cover; options are read-only. Modifier prices are only in the product sheet and in screen-reader/crawler text, by design.
- **Next steps:** none open for the menu look. Cloudflare purge driver is still a Noop.
- **Verified:** e2e menu-theme + billing-2b 31 pass; typecheck 8/8; web 403, site 97, shared 77 tests pass; lint only the known `UnsavedChangesGuard.tsx` error. **Not clicked in a browser** (3a and 3b): Playwright profile locked by another process. Check Free vs paid owner, 390/1440px, ar/en, cover, ticker, brand colour.
- **Gotchas:** migration `0024` does not exist (journal goes 0023 -> 0025). Root `.env` has CRLF line endings. After shared changes run `pnpm --filter @app/shared build`. The period-end downgrade happens by time (no webhook), so a CDN-cached menu can show the old look until its 60 s TTL ends. Local QA org `qa-cover@example.com` / `password-1234567`. e2e: `TS_NODE_PROJECT=./test/tsconfig.e2e.json pnpm exec jest --config test/jest-e2e.config.ts <name>` from `apps/api`.

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
