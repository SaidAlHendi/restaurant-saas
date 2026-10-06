# Release check

- CI green on the release commit: lint, typecheck, unit, integration, e2e.
- Migrations are backward compatible with the currently running version (old code + new schema works).
- API stays compatible with the previous web/PWA build (cashier tablets may run an old build for days).
- New features behind a feature flag if they change cashier or kitchen screens.
- Deploy outside lunch and dinner peaks of the main market.
- After deploy: watch Sentry and the order-creation error rate for 15 minutes; confirm a test order
  goes from cashier to kitchen on staging and production.
- Rollback plan written in the PR (previous image tag; migrations are additive so no down-migration needed).
