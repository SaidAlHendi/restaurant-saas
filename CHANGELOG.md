# Changelog

## 2026-11-09 - Per-branch availability for products and categories

### Added
- Products and categories stay shared across the organization, but each can be shown in all branches (default) or only in chosen branches: `available_in_all_branches` columns plus `product_branches` and `category_branches` (migration 0016). Existing items stay in all branches.
- `availableInAllBranches` and `branchIds` on product and category create, patch and responses; `GET /v1/products?branchId=` filters the list.
- Branch availability field in the product and category forms, a branch filter and an availability column on the products page.
- `GET /v1/me` now returns `allBranches` (the member can work in every branch).

### Changed
- POS menu, public branch menu and order creation only include products whose category and product are available in the branch (order lines for hidden products fail with `ORDER_PRODUCT_UNAVAILABLE`).
- Staff limited to some branches can only pick their own branches. They can hide an all-branches item from their branches, which turns it into an explicit list of the other branches. Only staff with access to every branch can choose "All branches".

## 2026-11-04 - Step 12a: admin API foundations

### Added
- `app_admin` Postgres role, `admin_users`, `admin_sessions`, `audit_logs` (migration 0013), `DATABASE_ADMIN_URL`, `JWT_ADMIN_SECRET`.
- `POST /v1/admin/auth/login|refresh|logout`, `GET /v1/admin/me`, `AdminAuthGuard`, `@RequireAdminRole`, `WithAdminService`.
- `pnpm --filter @app/api admin:create` to create the first platform admin.

### Changed
- Tenant auth now rejects suspended or cancelled organizations (`ORG_SUSPENDED`, `ORG_CANCELLED`).
- Local and CI setups must re-run `infra/postgres/init/01-roles.sql` (adds `app_admin`) before `db:migrate`.

## 2026-11-04 — Sahtain colors

### Changed
- Replaced the warm paprika palette with the Sahtain design colors (from the `sahtain-design` repo) in `packages/ui/src/styles/themes.css`.
  - Light: off-white canvas (`#f8f9f5`), white cards, deep forest-green primary (`#173f32`), pale-green secondary and active states (`#e8efe9`), amber accent and warning, muted text `#737a74`. The olive `accent-2` is now Sahtain green (`#285b46`).
  - Dark (`forest`): deep green surfaces, pale-green primary actions, amber timers.
  - New `--canvas` token for the page background, separate from card and sidebar surfaces.
  - New `data-surface="kds"` scope: the kitchen display renders on the dark green surface in either theme.
- Layout and shapes from the earlier rounded restyle (floating sidebar and headers, rounded cards, KDS tabs) are unchanged.

Work done while Said was away (2026-10-24). One section per branch/PR, newest first.

## `claude/project-thread-tx2tyq` — polish, warm restyle, canonical URLs

### Styling and color overhaul
- Replaced both palettes in `packages/ui/src/styles/themes.css` (theme names `cupcake`/`forest` kept so saved preferences still work).
  - Light: cream canvas, ivory cards, warm charcoal text, paprika (terracotta) brand, saffron highlight, paprika-tinted secondary.
  - Dark: warm espresso surfaces, the same hues lifted for contrast.
  - The brand is no longer green, so success/ready states stay visually distinct from primary actions.
- No component changes were needed for this: everything already uses the tokens.
- Before/after screenshots (desktop, mobile, English, Arabic, dark): `/mnt/project-files/reviews/restyle-2026-10-24/`.

### Kitchen display layout (fourth pass)
Said named the kitchen display as the one page still needing a layout refactor.
- Header: title with the branch as a subtitle (same height and padding as the other pages), sound and settings buttons on the end; the branch switcher moves to its own full-width row on phones.
- Phones: the three columns are now tabs (New, Preparing, Ready) with counts instead of one long stack; tablets and desktops still show all three side by side.
- Columns: empty columns show an icon and message in a dashed box instead of bare text.
- Fix: order cards were being squashed by their column so the Start/Ready button was cut off; cards no longer shrink.
- Rounded pass: cards use large radii, columns are more rounded, and the age marker is a rounded bar inside the card header instead of a hard edge.
- Screenshots: `kds-*.png` and `kds-round-*.png` in the same folder (the demo orders look old because the seed data is a day old, so every timer is red).

### Rounded sidebar and headers (fifth pass)
Said liked the rounder kitchen display and asked for the header and sidebar to match.
- The desktop sidebar and the page headers (dashboard, kitchen, cashier, phone top bar) are now floating rounded panels with a border and soft shadow, set in from the screen edge instead of full-bleed bars.
- The cashier cart panel is rounded to match.
- Screenshots: `rounded-*.png` in the same folder.

### Arabic font (sixth pass)
Said asked for a different Arabic font. The Arabic UI used the device's default font, which varies by phone and computer. It now uses Cairo (bundled with `@fontsource-variable/cairo`, no request to Google Fonts), set on `html[dir='rtl']` in `globals.css`. English keeps the system font. Screenshots: `font-before-ar-*.png` and `font-after-ar-*.png`. To try another font, change the one `font-family` rule and the import in `main.tsx`.

### Reverted: indigo/saffron identity
A third pass (indigo and saffron palette, star lattice, new fonts) was tried and reverted at Said's request (commits d5c545d and 8d43961). Said also clarified that "restyle" meant layout and structure of the sidebar, kitchen display and dashboard, not colors. The cream/paprika palette stays for now.

### Sidebar, kitchen display and dashboard restyle (second pass)
- **Sidebar:** header and footer separated by rules, tighter nav items with the active item tinted and its icon in the brand color, sub-menus (Menu, Cashier) indented under a rule instead of loose dots, and the footer is now a user card plus a compact icon row (theme, language, sign out, collapse) instead of three full-width rows.
- **Kitchen display:** columns sit on a soft tinted panel so white order cards stand out; cards get a colored edge bar by age (red/amber) instead of a thick border on every card; round check circles, pill timers, order notes on the highlight color.
- **Dashboard:** sales is the headline card in the brand color, every KPI has an icon, bars share one `BreakdownCard`, the double padding gap in cards is gone, table headers are aligned with their columns, and the date controls are one compact row.
- Screenshots: `after2-*.png` in the same folder.

### CI fix
- The first push failed the site build: prerendering `/`, `/ar` and `/en` now reads `PUBLIC_SITE_URL`, which is not set at build time. Those pages are server-rendered per request now (`prerender` removed in `react-router.config.ts`), so builds need no runtime env.

### Polish issues
You did not list the four issues in writing, so these are my best reading of them from running the app:
1. **Mobile branch chooser**: on POS, KDS and dashboard the branch select is now full width on phones (it was a cramped 50% or fixed-width box that wrapped next to Lock).
2. **Header alignment**: dashboard, POS and KDS headers now share the same minimum height and horizontal padding (`px-4 md:px-6`).
3. **Arabic top bar**: org and branch names are stored as "Arabic / English". They are now shown in the UI language only (new `localizedName` helper), and titles use `dir="auto"` so mixed text no longer scrambles or truncates on the wrong side.
4. **Duplicate Cancel**: dialogs and sheets had an X close button labeled "Cancel" plus a footer Cancel. The X is removed where a footer Cancel exists (Escape and backdrop click still close).

### Canonical URL
- `https://example.com` placeholders in the home routes replaced with `PUBLIC_SITE_URL` through route loaders (`homeCanonicalUrl`). If no loader data is available the canonical tag is omitted instead of guessed.

### Code review of main
- Spot-checked the order payment path (row lock, idempotency key, overpay and version checks): no bug found. `pnpm lint` and `pnpm typecheck` are clean across the repo, web tests pass (239). This was a targeted pass on top of the 2026-10-16 review, not a full audit.

## Second accent color (experiment)
- Added an olive `accent-2` token (`--brand-accent-2` in `themes.css`, exposed as `bg-accent-2` / `text-accent-2`).
- Toned down: olive only on stat-card icon chips, secondary badges (soft tint) and KDS column panels (15% tint). Active sidebar item and avatar use the primary-tinted secondary again.
- To remove: delete the token lines in `themes.css` and swap those three usages back (`bg-secondary text-secondary-foreground`, `text-muted-foreground/80`, `bg-foreground/5`).
