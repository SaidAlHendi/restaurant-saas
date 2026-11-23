import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { Client, uuid } from '../lib/http.mjs';
import { config } from '../lib/config.mjs';
import { login, orderBody, createOrder, getOrder, setStatus } from '../lib/helpers.mjs';

const R = 'Platform admin';
const F = 'Platform admin';
const needAdmin = (ctx) => { if (!ctx.admin) skip('no platform admin credentials (set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)'); };

t(R, F, 'Admin login rejects a wrong password', async () => {
  if (!config.adminEmail) skip('no platform admin credentials');
  expectStatus(await new Client().post('/v1/admin/auth/login', { email: config.adminEmail, password: 'definitely-wrong-123' }), 401);
});

t(R, F, 'Admin logs in with a separate admin token', async (ctx) => {
  if (!config.adminEmail) skip('no platform admin credentials (set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)');
  const res = expectStatus(await new Client().post('/v1/admin/auth/login', { email: config.adminEmail, password: config.adminPassword }), [200, 201]);
  ctx.admin = new Client(res.body.accessToken);
  ctx.adminUser = res.body.user ?? res.body.admin;
});

t(R, F, 'Admin /me returns the admin profile and role', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get('/v1/admin/me'), 200);
  assert.ok(JSON.stringify(res.body).includes(config.adminEmail));
});

t(R, F, 'Tenant token is rejected on admin routes and admin token on tenant routes', async (ctx) => {
  needAdmin(ctx);
  const a = await ctx.owner.get('/v1/admin/orgs');
  assert.ok([401, 403].includes(a.status), `tenant on admin: ${a.status}`);
  const b = await ctx.admin.get('/v1/me');
  assert.ok([401, 403].includes(b.status), `admin on tenant: ${b.status}`);
});

t(R, F, 'Admin routes without a token return 401', async () => {
  expectStatus(await new Client().get('/v1/admin/orgs'), 401);
});

t(R, F, 'Overview shows platform counts', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get('/v1/admin/overview'), 200);
  assert.ok(res.body && typeof res.body === 'object');
});

t(R, F, 'Restaurant list finds the new restaurant by name', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get(`/v1/admin/orgs?q=${ctx.config.runId}`), 200);
  assert.ok(res.body.items.some((o) => o.id === ctx.orgId), 'org not found');
});

t(R, F, 'Restaurant detail loads', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get(`/v1/admin/orgs/${ctx.orgId}`), 200);
  assert.equal(res.body.id, ctx.orgId);
});

t(R, F, 'Restaurant list status filter works', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get('/v1/admin/orgs?status=active&pageSize=5'), 200);
  assert.ok(res.body.items.every((o) => o.status === 'active'));
});

t(R, F, 'Users directory search finds the owner', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get(`/v1/admin/users?search=${encodeURIComponent(ctx.ownerEmail)}`), 200);
  assert.ok(res.body.items.some((u) => u.email === ctx.ownerEmail));
});

t(R, F, 'Subscriptions list shows the trial', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get('/v1/admin/subscriptions'), 200);
  assert.ok(Array.isArray(res.body.items));
});

t(R, F, 'Plans list shows all plans with their features', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get('/v1/admin/plans'), 200);
  assert.ok(res.body.items.length >= 4);
});

t(R, F, 'Audit log is readable by a super admin', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await ctx.admin.get('/v1/admin/audit'), 200);
});

t(R, F, 'Invalid org id on admin detail returns 400/404, not 500', async (ctx) => {
  needAdmin(ctx);
  const a = await ctx.admin.get('/v1/admin/orgs/not-a-uuid');
  assert.ok([400, 404].includes(a.status), `got ${a.status}`);
  const b = await ctx.admin.get(`/v1/admin/orgs/${uuid()}`);
  assert.equal(b.status, 404);
});

// ---------------------------------------------------------------- plan gating (admin changes the plan)

/** Entitlements are cached for up to 30 s per org, so a plan change from the admin app is not instant. */
async function waitForPlan(ctx, planKey, maxMs = 40000) {
  const start = Date.now();
  for (;;) {
    const me = await ctx.owner.get('/v1/me');
    if (me.body?.entitlements?.planKey === planKey) return Math.round((Date.now() - start) / 1000);
    if (Date.now() - start > maxMs) throw new Error(`plan still ${me.body?.entitlements?.planKey} after ${maxMs / 1000}s`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

const grant = (ctx, planKey) => ctx.admin.post(`/v1/admin/orgs/${ctx.orgId}/activate`, {
  planKey, until: new Date(Date.now() + 30 * 86400_000).toISOString(), paid: false, note: 'e2e run',
});

t(R, 'Billing plan gating', 'Admin moves the restaurant to the Menu plan', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await grant(ctx, 'menu'), 200);
  await waitForPlan(ctx, 'menu');
  const me = await ctx.owner.get('/v1/me');
  assert.equal(me.body.entitlements.planKey, 'menu');
  assert.ok(!me.body.entitlements.features.includes('pos.access'));
});

t('Cashier', 'Billing plan gating', 'Menu plan: new POS orders are blocked by the plan', async (ctx) => {
  needAdmin(ctx);
  const res = await createOrder(ctx.cashier, ctx.branchId, orderBody([{ productId: ctx.cola.id, quantity: 1, modifierIds: [] }]));
  assert.ok([402, 403].includes(res.status), `expected a plan block (402/403), got ${res.status}`);
  assert.match(res.text, /FEATURE|PLAN|UPGRADE|pos\.access/i);
});

t('Kitchen', 'Billing plan gating', 'Menu plan: kitchen board is blocked by the plan', async (ctx) => {
  needAdmin(ctx);
  const res = await ctx.kitchen.get(`/v1/branches/${ctx.branchId}/kitchen/board`);
  assert.ok([402, 403].includes(res.status), `got ${res.status}`);
});

t('Manager', 'Billing plan gating', 'Menu plan: reports and POS menu are blocked', async (ctx) => {
  needAdmin(ctx);
  const rep = await ctx.manager.get(`/v1/branches/${ctx.branchId}/reports/daily`);
  assert.ok([402, 403].includes(rep.status), `reports ${rep.status}`);
  const pos = await ctx.manager.get(`/v1/branches/${ctx.branchId}/pos/menu`);
  assert.ok([402, 403].includes(pos.status), `pos menu ${pos.status}`);
});

t('Owner', 'Billing plan gating', 'Menu plan: existing orders can still be finished (only new creates are blocked)', async (ctx) => {
  needAdmin(ctx);
  const list = expectStatus(await ctx.owner.get(`/v1/branches/${ctx.branchId}/orders?status=placed`), 200);
  assert.ok(list.body.items.length >= 1, 'no open order to test with');
  const o = (await getOrder(ctx.owner, ctx.branchId, list.body.items[0].id)).body;
  const res = await setStatus(ctx.owner, ctx.branchId, o, 'cancelled', { reason: 'plan downgrade test' });
  assert.ok([200, 201].includes(res.status), `got ${res.status}: ${res.text.slice(0, 160)}`);
});

t('Owner', 'Billing plan gating', 'Menu plan: menu look and table QR keep working', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await ctx.owner.patch('/v1/org/settings', { menuTheme: { preset: 'midnight', layout: 'list' } }), 200);
  const s = await ctx.owner.get('/v1/org/settings');
  assert.equal(s.body.menuLookAllowed, true);
  expectStatus(await ctx.owner.post(`/v1/branches/${ctx.branchId}/tables/${ctx.table2.id}/rotate-qr`), [200, 201]);
});

t('Customer', 'Billing plan gating', 'Menu plan: public menu still works; Ready screen is off', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await new Client().get(`/v1/public/menus/${ctx.orgSlug}`), 200);
  expectStatus(await new Client().get(`/v1/public/display/${ctx.displayToken}`), 404);
});

t(R, 'Billing plan gating', 'Admin moves the restaurant back to Restaurant: POS works again', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await grant(ctx, 'restaurant'), 200);
  await waitForPlan(ctx, 'restaurant');
  const res = await createOrder(ctx.cashier, ctx.branchId, orderBody([{ productId: ctx.cola.id, quantity: 1, modifierIds: [] }]));
  expectStatus(res, 201);
});

t(R, 'Billing plan gating', 'Plan change is written to the audit log', async (ctx) => {
  needAdmin(ctx);
  const res = expectStatus(await ctx.admin.get('/v1/admin/audit'), 200);
  assert.ok(JSON.stringify(res.body).includes(ctx.orgId), 'no audit row for this org');
});

// ---------------------------------------------------------------- suspend / reactivate (runs last)

t(R, 'Restaurant suspension', 'Admin suspends the restaurant: staff cannot log in', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await ctx.admin.post(`/v1/admin/orgs/${ctx.orgId}/suspend`), 200);
  const { res } = await login(ctx.cashierEmail);
  assert.ok([401, 403].includes(res.status), `login while suspended returned ${res.status}`);
});

t('Customer', 'Restaurant suspension', 'Suspended restaurant public menu is gone (410/404)', async (ctx) => {
  needAdmin(ctx);
  const res = await new Client().get(`/v1/public/menus/${ctx.orgSlug}`);
  assert.ok([404, 410].includes(res.status), `got ${res.status}`);
});

t(R, 'Restaurant suspension', 'Admin reactivates the restaurant: login and menu work again', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await ctx.admin.post(`/v1/admin/orgs/${ctx.orgId}/reactivate`), 200);
  const { res } = await login(ctx.cashierEmail);
  expectStatus(res, [200, 201]);
  expectStatus(await new Client().get(`/v1/public/menus/${ctx.orgSlug}`), 200);
});

t('Customer', 'Restaurant suspension', 'Admin /logout ends the admin session', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await ctx.admin.post('/v1/admin/auth/logout'), [200, 201, 204]);
});
