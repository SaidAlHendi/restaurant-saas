# Changelog

## Unreleased

### Changed
- Restyled the UI kit to the Sahtain design (from the `sahtain-design` repo). The design is token-driven, so most of it lands in `packages/ui/src/styles/themes.css`:
  - Light theme: warm off-white canvas (`#f8f9f5`), white surfaces, deep forest-green primary (`#173f32`), pale-green secondary and active states (`#e8efe9`), amber accent and warning, muted text `#737a74`.
  - Dark theme (`forest`): deep green surfaces, pale-green primary actions, amber timers.
  - New `--canvas` token for the page background (separate from card/sidebar surfaces); new `data-surface="kds"` scope that gives a screen the dark kitchen palette in either theme.
  - Smaller radii (`--radius` 0.375rem) and flat 1px borders: removed card, stat card, KDS card and button shadows.
- Sidebar: compact 40px items, 17px icons, small letter-spaced group labels.
- StatCard: lighter, larger value (`text-3xl font-medium tracking-tight`), flat.
- KDS screen now renders on the dark green surface with translucent columns.
