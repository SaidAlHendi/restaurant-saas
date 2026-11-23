# E2E role report

A zero-dependency Node script (Node 22+, built-in `fetch`) that drives the running API as every role and writes a pass/fail report per feature per role.

Roles covered: platform admin, owner, manager, cashier, kitchen, customer (public menu, QR, ready screen) and anonymous/attacker checks.
Features covered: auth and signup, staff and roles (invites, PIN login, permission overrides), catalog (categories, products, modifier groups, images), settings (org, branch, tables, devices, menu look, display currency), orders and POS (modifiers, idempotency, pager, payments, bills, void/cancel approvals, reopen, reports), kitchen display, public menu and QR, billing and plan gating, platform admin (list, suspend, plan change, audit), a role x endpoint permission matrix, tenant-isolation and input-hardening checks, and "instant effects": websocket pushes (new order, status, void, catalog change) and changes that must hit already-logged-in users at once (permission or role change, disabling a user, branch scope or deactivation, plan change and suspension by the platform admin). Set `E2E_IMMEDIATE_MS` (default 3000) to change what counts as immediate. Socket checks use `socket.io-client` from `apps/api`, so run `pnpm install` first.

## Run

```bash
# 1. start the stack (Postgres, Redis, API on :3000; web/site/admin optional)
pnpm dev

# 2. run everything
pnpm e2e:report            # or: node scripts/e2e-report/run.mjs

# run only some files (match on file name)
node scripts/e2e-report/run.mjs orders kitchen
```

Output goes to `scripts/e2e-report/reports/`: `report.html` (open in a browser), `report.md` and `report.json`. Exit code is 1 when any check fails.

Each run signs up its own fresh restaurant, so it needs no seed data and never touches existing tenants. Run data is left in the database; use a dev or test database, not production.

## Platform admin tests

Create a platform admin once, then pass its credentials. Without them the admin and plan-gating checks are reported as skipped.

```bash
ADMIN_PASSWORD='a-long-password' pnpm --filter @app/api admin:create --email e2e@example.com --role super
E2E_ADMIN_EMAIL=e2e@example.com E2E_ADMIN_PASSWORD='a-long-password' pnpm e2e:report
```

The plan-gating checks wait up to 40 s after a plan change because entitlements are cached for 30 s.

## Configuration (environment variables)

| Variable | Default |
|---|---|
| `API_URL` | `http://localhost:3000` |
| `WEB_URL` / `SITE_URL` / `ADMIN_URL` | `:5173` / `:5174` / `:5175` (reachability checks, skipped when not running) |
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | unset |
| `E2E_PASSWORD` | password for users the run creates |
| `E2E_OUT_DIR` | `scripts/e2e-report/reports/` |

## Known limits

- Signup is rate limited to 5 attempts per hour per IP and a run makes 7, so a second run within the hour gets HTTP 429 unless the limiter is cleared. Locally: `redis-cli --scan --pattern '*throttl*' | xargs redis-cli del`.
- The landing-page lead form is only checked for validation, so a run never sends a real email.
- Image uploads are skipped when media storage is not configured.
- Browser UI is not driven; this suite is API-level only.

## Add a test

Create `tests/NN-name.mjs` (files run in name order) and register checks:

```js
import { t, assert, expectStatus } from '../lib/runner.mjs';

t('Cashier', 'Orders & POS', 'does the thing', async (ctx) => {
  const res = expectStatus(await ctx.cashier.get('/v1/products'), 200);
  assert.ok(res.body.items.length > 0);
});
```

`ctx` is shared and filled by earlier files: `owner`, `manager`, `cashier`, `kitchen` (API clients already logged in), `orgId`, `branchId`, `orgSlug`, `burger`, `cola`, `table1`, `admin` and more. Throw `skip('why')` to mark a check skipped.
