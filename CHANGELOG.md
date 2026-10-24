# Changelog

Work done while Said was away (2026-10-24). One section per branch/PR, newest first.

## `claude/project-thread-tx2tyq` — polish, warm restyle, canonical URLs

### Styling and color overhaul
- Replaced both palettes in `packages/ui/src/styles/themes.css` (theme names `cupcake`/`forest` kept so saved preferences still work).
  - Light: cream canvas, ivory cards, warm charcoal text, paprika (terracotta) brand, saffron highlight, paprika-tinted secondary.
  - Dark: warm espresso surfaces, the same hues lifted for contrast.
  - The brand is no longer green, so success/ready states stay visually distinct from primary actions.
- No component changes were needed for this: everything already uses the tokens.
- Before/after screenshots (desktop, mobile, English, Arabic, dark): `/mnt/project-files/reviews/restyle-2026-10-24/`.

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
