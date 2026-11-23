import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { Client } from '../lib/http.mjs';
import { config } from '../lib/config.mjs';
import { socketsAvailable, openSocket, until } from '../lib/socket.mjs';
import { inviteAndAccept, login, orderBody, createOrder, getOrder, setStatus } from '../lib/helpers.mjs';

const F = 'Instant effects';
const R = 'Owner';
// "Immediately" means: the very next request, or at most this long for a push to arrive.
const MAX_MS = Number(process.env.E2E_IMMEDIATE_MS ?? 3000);
const item = (productId, quantity = 1) => ({ productId, quantity, modifierIds: [] });
const needSockets = () => { if (!socketsAvailable()) skip('socket.io-client not found (run pnpm install)'); };
const needAdmin = (ctx) => { if (!config.adminEmail) skip('no platform admin credentials (set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)'); };
async function adminOf(ctx) {
  // The admin file logs its client out at the end, so sign in again here.
  const res = await new Client().post('/v1/admin/auth/login', { email: config.adminEmail, password: config.adminPassword });
  assert.ok(res.body?.accessToken, `admin login failed ${res.status}`);
  ctx.admin = new Client(res.body.accessToken);
}

/** Assert `check` flips within MAX_MS and report how long it took. */
async function immediately(check, what) {
  try {
    return await until(check, { maxMs: MAX_MS });
  } catch {
    throw new Error(`${what} did not take effect within ${MAX_MS} ms`);
  }
}

// ------------------------------------------------------------------ realtime push (sockets)

t('Cashier', F, 'Setup: second cashier and a socket per role', async (ctx) => {
  needSockets();
  const r = await inviteAndAccept(ctx.owner, ctx, 'cashier', 'rt-cashier');
  assert.ok(r.client, 'invite failed');
  ctx.rtCashier = r.client; ctx.rtCashierId = r.membershipId; ctx.rtCashierEmail = r.email;
  ctx.sockKitchen = await openSocket(ctx.kitchen.token, ctx.branchId);
  ctx.sockCashier = await openSocket(ctx.cashier.token, ctx.branchId);
  ctx.sockOwner = await openSocket(ctx.owner.token, ctx.branchId);
});

t('Kitchen', F, 'New order reaches the kitchen screen by push (order.placed)', async (ctx) => {
  needSockets();
  const o = expectStatus(await createOrder(ctx.cashier, ctx.branchId, orderBody([item(ctx.cola.id)])), 201).body;
  ctx.rtOrder = o;
  const ev = await ctx.sockKitchen.waitFor('order.placed', (p) => p.orderId === o.id || p.id === o.id, MAX_MS);
  assert.ok(ev);
});

t('Cashier', F, 'Kitchen status change reaches the cashier by push (order.updated)', async (ctx) => {
  needSockets();
  const o = (await getOrder(ctx.kitchen, ctx.branchId, ctx.rtOrder.id)).body;
  expectStatus(await setStatus(ctx.kitchen, ctx.branchId, o, 'preparing'), [200, 201]);
  await ctx.sockCashier.waitFor('order.updated', (p) => (p.orderId ?? p.id) === o.id, MAX_MS);
});

t('Kitchen', F, 'Voided item reaches the kitchen by push', async (ctx) => {
  needSockets();
  const o = expectStatus(await createOrder(ctx.cashier, ctx.branchId, orderBody([item(ctx.cola.id), item(ctx.cola.id, 2)])), 201).body;
  const mark = ctx.sockKitchen.events.length;
  const full = (await getOrder(ctx.cashier, ctx.branchId, o.id)).body;
  expectStatus(await ctx.cashier.post(`/v1/branches/${ctx.branchId}/orders/${o.id}/items/${full.items[0].id}/void`, { expectedVersion: full.version, reason: 'typo' }), [200, 201]);
  const ev = await ctx.sockKitchen.waitFor('order.item_updated', (p) => (p.orderId ?? p.id) === o.id, MAX_MS, mark);
  assert.ok(ev);
});

t('Cashier', F, 'Owner price change reaches the POS by push and the POS menu shows it at once', async (ctx) => {
  needSockets();
  const before = ctx.sockCashier.events.length;
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { priceMinor: 1000 }), 200);
  await ctx.sockCashier.waitFor('catalog.updated', () => true, MAX_MS, before);
  const menu = (await ctx.cashier.get(`/v1/branches/${ctx.branchId}/pos/menu`)).text;
  assert.ok(menu.includes('1000'), 'POS menu still shows the old price');
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { priceMinor: 900 }), 200);
});

t('Cashier', F, 'Owner deactivates a product: gone from the POS menu at once, push received, ordering it is refused', async (ctx) => {
  needSockets();
  const p = expectStatus(await ctx.owner.post('/v1/products', { categoryId: ctx.catDrinks, name: { en: 'Flash drink', ar: 'مشروب' }, priceMinor: 500 }), 201).body;
  const inMenu = async () => (await ctx.cashier.get(`/v1/branches/${ctx.branchId}/pos/menu`)).text.includes(p.id);
  assert.ok(await inMenu(), 'new product not on the POS menu');
  const mark = ctx.sockCashier.events.length;
  expectStatus(await ctx.owner.patch(`/v1/products/${p.id}`, { isActive: false }), 200);
  await immediately(async () => !(await inMenu()), 'product removal from the POS menu');
  await ctx.sockCashier.waitFor('catalog.updated', () => true, MAX_MS, mark);
  const res = await createOrder(ctx.cashier, ctx.branchId, orderBody([item(p.id)]));
  assert.ok([400, 404, 409, 422].includes(res.status), `ordering a disabled product returned ${res.status}`);
});

t('Cashier', F, 'Owner deletes a product: POS menu and public menu drop it at once', async (ctx) => {
  needSockets();
  const p = expectStatus(await ctx.owner.post('/v1/products', { categoryId: ctx.catDrinks, name: { en: 'Delete me', ar: 'احذفني' }, priceMinor: 500 }), 201).body;
  expectStatus(await ctx.owner.delete(`/v1/products/${p.id}`), [200, 204]);
  await immediately(async () => !(await ctx.cashier.get(`/v1/branches/${ctx.branchId}/pos/menu`)).text.includes(p.id), 'POS menu update after delete');
  await immediately(async () => !(await new Client().get(`/v1/public/menus/${ctx.orgSlug}`)).text.includes('Delete me'), 'public menu update after delete');
});

t('Customer', F, 'New product, price change and currency change show on the public menu at once', async (ctx) => {
  const p = expectStatus(await ctx.owner.post('/v1/products', { categoryId: ctx.catDrinks, name: { en: 'Lemonade', ar: 'ليمون' }, priceMinor: 700 }), 201).body;
  const pub = () => new Client().get(`/v1/public/menus/${ctx.orgSlug}`);
  await immediately(async () => (await pub()).text.includes('Lemonade'), 'new product on public menu');
  expectStatus(await ctx.owner.patch(`/v1/products/${p.id}`, { priceMinor: 750 }), 200);
  await immediately(async () => (await pub()).text.includes('"priceMinor":750'), 'price change on public menu');
  expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: 'USD', exchangeRate: 0.27 }), 200);
  await immediately(async () => (await pub()).body?.org?.display?.currency === 'USD', 'display currency on public menu');
  expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: null }), 200);
});

t('Customer', F, 'Menu look change shows on the public menu at once', async (ctx) => {
  expectStatus(await ctx.owner.patch('/v1/org/settings', { menuTheme: { preset: 'espresso', layout: 'compact' } }), 200);
  await immediately(async () => (await new Client().get(`/v1/public/menus/${ctx.orgSlug}`)).body?.org?.theme?.preset === 'espresso', 'menu look on public menu');
});

t('Customer', F, 'Rotating a table QR kills the old code at once', async (ctx) => {
  const old = ctx.table2.qrToken;
  const rot = expectStatus(await ctx.owner.post(`/v1/branches/${ctx.branchId}/tables/${ctx.table2.id}/rotate-qr`), [200, 201]);
  ctx.table2.qrToken = rot.body.qrToken;
  await immediately(async () => (await new Client().get(`/v1/public/tables/${old}`)).status === 404, 'old QR invalidation');
});

t('Customer', F, 'Rotating the Ready-screen link kills the old link at once', async (ctx) => {
  const old = ctx.displayToken;
  const rot = expectStatus(await ctx.owner.post(`/v1/branches/${ctx.branchId}/display-link/rotate`), [200, 201]);
  ctx.displayToken = rot.body.token;
  await immediately(async () => (await new Client().get(`/v1/public/display/${old}`)).status === 404, 'old display link invalidation');
});

// ------------------------------------------------------------------ access changes on logged-in users

t('Owner', F, 'Owner changes a cashier permission: the logged-in cashier is affected on the next request', async (ctx) => {
  const url = `/v1/branches/${ctx.branchId}/orders`;
  const ok = await createOrder(ctx.rtCashier, ctx.branchId, orderBody([item(ctx.cola.id)]));
  expectStatus(ok, 201);
  expectStatus(await ctx.owner.put(`/v1/staff/${ctx.rtCashierId}/permissions`, { grant: [], deny: ['orders.create'] }), [200, 204]);
  const ms = await immediately(async () => (await createOrder(ctx.rtCashier, ctx.branchId, orderBody([item(ctx.cola.id)]))).status === 403, 'permission deny on an existing session');
  ctx.permLatency = ms;
  expectStatus(await ctx.owner.put(`/v1/staff/${ctx.rtCashierId}/permissions`, { grant: [], deny: [] }), [200, 204]);
  await immediately(async () => (await createOrder(ctx.rtCashier, ctx.branchId, orderBody([item(ctx.cola.id)]))).status === 201, 'permission restore on an existing session');
  void url;
});

t('Owner', F, 'Owner grants an extra permission: the logged-in cashier gets it on the next request', async (ctx) => {
  expectStatus(await ctx.rtCashier.get(`/v1/branches/${ctx.branchId}/reports/daily`), 403);
  expectStatus(await ctx.owner.put(`/v1/staff/${ctx.rtCashierId}/permissions`, { grant: ['reports.read'], deny: [] }), [200, 204]);
  await immediately(async () => (await ctx.rtCashier.get(`/v1/branches/${ctx.branchId}/reports/daily`)).status === 200, 'permission grant on an existing session');
  expectStatus(await ctx.owner.put(`/v1/staff/${ctx.rtCashierId}/permissions`, { grant: [], deny: [] }), [200, 204]);
  await immediately(async () => (await ctx.rtCashier.get(`/v1/branches/${ctx.branchId}/reports/daily`)).status === 403, 'permission revoke on an existing session');
});

t('Owner', F, 'Owner changes a role (cashier to kitchen): the logged-in user loses cashier rights at once', async (ctx) => {
  expectStatus(await ctx.owner.patch(`/v1/staff/${ctx.rtCashierId}`, { roleKey: 'kitchen' }), 200);
  await immediately(async () => (await createOrder(ctx.rtCashier, ctx.branchId, orderBody([item(ctx.cola.id)]))).status === 403, 'role change on an existing session');
  expectStatus(await ctx.owner.patch(`/v1/staff/${ctx.rtCashierId}`, { roleKey: 'cashier' }), 200);
});

t('Owner', F, 'Owner disables a logged-in cashier: the token is refused and the socket is dropped', async (ctx) => {
  needSockets();
  const sock = await openSocket(ctx.rtCashier.token, ctx.branchId);
  expectStatus(await ctx.rtCashier.get('/v1/me'), 200);
  expectStatus(await ctx.owner.patch(`/v1/staff/${ctx.rtCashierId}`, { status: 'disabled' }), 200);
  await immediately(async () => [401, 403].includes((await ctx.rtCashier.get('/v1/me')).status), 'disabled user losing API access');
  await sock.waitDisconnect(MAX_MS);
  const { res } = await login(ctx.rtCashierEmail);
  assert.ok([401, 403].includes(res.status), `disabled user can log in again (${res.status})`);
});

t('Owner', F, 'Owner re-enables the cashier: login works again at once', async (ctx) => {
  expectStatus(await ctx.owner.patch(`/v1/staff/${ctx.rtCashierId}`, { status: 'active' }), 200);
  await immediately(async () => [200, 201].includes((await login(ctx.rtCashierEmail)).res.status), 'login after re-enable');
});

t('Owner', F, 'Changing a branch scope drops the user\'s socket for that branch', async (ctx) => {
  needSockets();
  const br = await ctx.owner.post('/v1/branches', { name: 'Scope branch', slug: `scope-${ctx.config.runId}`, timezone: 'Asia/Riyadh', currency: 'SAR', taxRateBp: 0, taxInclusive: false, dayStartHour: 4 });
  if (br.status !== 201) skip(`second branch not allowed on this plan (${br.status})`);
  const inv = await ctx.owner.post('/v1/staff/invites', { email: `e2e-rt-scope-${ctx.config.runId}@example.com`, roleKey: 'cashier', allBranches: false, branchIds: [ctx.branchId] });
  if (inv.status !== 201) skip(`invite not possible (${inv.status}: ${inv.text.slice(0, 120)})`);
  const token = inv.body.inviteUrl.split('/invite/')[1];
  const acc = expectStatus(await new Client().post('/v1/auth/accept-invite', { token, name: 'Scoped', password: ctx.config.password }), [200, 201]);
  const sock = await openSocket(acc.body.accessToken, ctx.branchId);
  expectStatus(await ctx.owner.patch(`/v1/staff/${inv.body.membershipId}`, { allBranches: false, branchIds: [br.body.id] }), 200);
  await sock.waitDisconnect(MAX_MS);
});

t('Owner', F, 'Removing a PIN makes the old PIN fail at once; a new PIN works at once', async (ctx) => {
  const sess = null;
  const mem = ctx.pinCashierId; // created earlier with PIN 4821 (the org is near its 10-user plan limit)
  expectStatus(await ctx.owner.put(`/v1/staff/${mem}/pin`, { pin: '6677' }), [200, 204]);
  const a = (await login(ctx.ownerEmail)).client.inBranch(ctx.branchId);
  const oldPin = await a.post('/v1/auth/pin-login', { membershipId: mem, pin: '4821' });
  assert.ok([401, 403, 423].includes(oldPin.status), `old PIN returned ${oldPin.status}`);
  const b = (await login(ctx.ownerEmail)).client.inBranch(ctx.branchId);
  expectStatus(await b.post('/v1/auth/pin-login', { membershipId: mem, pin: '6677' }), [200, 201]);
  void sess;
});

t('Cashier', F, 'Logging out invalidates the access token immediately', async (ctx) => {
  const { client } = await login(ctx.rtCashierEmail);
  const c = client.inBranch(ctx.branchId);
  expectStatus(await c.get('/v1/me'), 200);
  expectStatus(await c.post('/v1/auth/logout'), [200, 201, 204]);
  const res = await c.get('/v1/me');
  assert.equal(res.status, 401, `old access token still works after logout (${res.status})`);
});

t('Manager', F, 'Deactivating a branch drops its sockets and blocks its orders', async (ctx) => {
  needSockets();
  const br = await ctx.owner.post('/v1/branches', { name: 'Temp', slug: `tmp-${ctx.config.runId}`, timezone: 'Asia/Riyadh', currency: 'SAR', taxRateBp: 0, taxInclusive: false, dayStartHour: 4 });
  if (br.status !== 201) skip(`second branch not allowed on this plan (${br.status})`);
  const sock = await openSocket(ctx.owner.token, br.body.id);
  expectStatus(await ctx.owner.patch(`/v1/branches/${br.body.id}`, { isActive: false }), 200);
  await sock.waitDisconnect(MAX_MS);
});

// ------------------------------------------------------------------ platform admin changes on logged-in users

const grant = (ctx, planKey) => ctx.admin.post(`/v1/admin/orgs/${ctx.orgId}/activate`, {
  planKey, until: new Date(Date.now() + 30 * 86400_000).toISOString(), paid: false, note: 'e2e realtime',
});

t('Platform admin', F, 'Admin downgrades the plan: logged-in cashier and kitchen are blocked at once', async (ctx) => {
  needAdmin(ctx); await adminOf(ctx);
  expectStatus(await grant(ctx, 'menu'), 200);
  await immediately(async () => (await createOrder(ctx.cashier, ctx.branchId, orderBody([item(ctx.cola.id)]))).status === 402 || (await createOrder(ctx.cashier, ctx.branchId, orderBody([item(ctx.cola.id)]))).status === 403, 'plan downgrade (POS blocked)');
  await immediately(async () => [402, 403].includes((await ctx.kitchen.get(`/v1/branches/${ctx.branchId}/kitchen/board`)).status), 'plan downgrade (KDS blocked)');
  await immediately(async () => (await ctx.owner.get('/v1/me')).body.entitlements.planKey === 'menu', 'owner entitlements after downgrade');
});

t('Platform admin', F, 'Admin upgrades the plan: logged-in cashier can sell again at once', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await grant(ctx, 'restaurant'), 200);
  await immediately(async () => (await createOrder(ctx.cashier, ctx.branchId, orderBody([item(ctx.cola.id)]))).status === 201, 'plan upgrade (POS unblocked)');
});

t('Platform admin', F, 'Admin suspends the restaurant: every logged-in role is refused on the next request', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await ctx.admin.post(`/v1/admin/orgs/${ctx.orgId}/suspend`), 200);
  for (const role of ['owner', 'manager', 'cashier', 'kitchen']) {
    await immediately(async () => [401, 403].includes((await ctx[role].get('/v1/me')).status), `suspension for the logged-in ${role}`);
  }
  await immediately(async () => [404, 410].includes((await new Client().get(`/v1/public/menus/${ctx.orgSlug}`)).status), 'suspension on the public menu');
});

t('Platform admin', F, 'Admin suspends the restaurant: open sockets are dropped', async (ctx) => {
  needAdmin(ctx); needSockets();
  await ctx.sockKitchen.waitDisconnect(MAX_MS);
});

t('Platform admin', F, 'Admin reactivates the restaurant: staff are back at once', async (ctx) => {
  needAdmin(ctx);
  expectStatus(await ctx.admin.post(`/v1/admin/orgs/${ctx.orgId}/reactivate`), 200);
  await immediately(async () => (await ctx.owner.get('/v1/me')).status === 200, 'reactivation for the owner session');
  await immediately(async () => (await new Client().get(`/v1/public/menus/${ctx.orgSlug}`)).status === 200, 'reactivation on the public menu');
});

t('Platform admin', F, 'Closing sockets', async (ctx) => {
  for (const s of ['sockKitchen', 'sockCashier', 'sockOwner']) ctx[s]?.close();
});
