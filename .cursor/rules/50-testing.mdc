---
description: Testing rules. Apply when writing or changing tests or finishing any task.
globs: "**/*.spec.ts,**/*.e2e-spec.ts,**/*.test.ts,**/*.test.tsx,e2e/**"
alwaysApply: false
---
# Testing rules

- API (NestJS): Jest + Supertest. E2E specs boot `AppModule` via `Test.createTestingModule` against a real
  Postgres (`restaurant_saas_test` on localhost:5432 by default, see `apps/api/test/test-db-env.ts`;
  CI uses 5433). No DB mocks. Unit specs for pure logic.
- Each e2e test creates its own org/branch data (factories and helpers in `apps/api/test/`); never change
  the shared seed orgs, never share mutable fixtures.
- Every new endpoint: happy path, 400 validation, 403 missing permission, 404 other tenant.
- Order flow changes: duplicate submit, concurrent status change, invalid transition, edit after send.
- External providers (Paddle, mail, storage) are never called from tests: override the provider token
  with a fake from `apps/api/test/`.
- Web/site: Vitest + Testing Library; MSW or mocked RTK Query hooks for API calls.
- Playwright e2e (not set up yet): signup → menu → public menu page; POS order → KDS → ready.
- Never skip, `.only`, or delete a failing test to make CI green. Fix the cause or ask.
