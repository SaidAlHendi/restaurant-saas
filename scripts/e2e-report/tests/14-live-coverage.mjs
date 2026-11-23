import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { uuid } from '../lib/http.mjs';
import { config } from '../lib/config.mjs';
import { Client } from '../lib/http.mjs';
import { socketsAvailable, openSocket, until } from '../lib/socket.mjs';
import { orderBody, createOrder, payOrder, setStatus, getOrder, pngForm } from '../lib/helpers.mjs';

// Live-update coverage: for every write endpoint, does an open screen in the right place get told?
// "Right place" = the branch room(s) of the restaurant, never another restaurant or an unrelated branch.
// Catalog and order writes must send their dedicated events. Everything else listed under "Settings,
// staff, tables, plan" changes data that open POS/KDS/dashboard screens show, but today sends nothing,
// so those checks fail on purpose until a live event exists for them.
const WAIT_MS = Number(process.env.E2E_PUSH_MS ?? 1500);
const item = (productId, quantity = 1) => ({ productId, quantity, modifierIds: [] });
const needSockets = () => { if (!socketsAvailable()) skip('socket.io-client not found (run pnpm install)'); };

/** Run `action`, then wait for an event on `sock` that arrived after the call started. */
async function quiet(sock, quietMs = 700, maxMs = 4000) {
  // Events from the previous write can still be on their way (the outbox is polled), so wait until
  // nothing has arrived for a moment; otherwise a late event would be mistaken for this write's.
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const last = sock.events.at(-1)?.at ?? 0;
    if (Date.now() - last > quietMs && Date.now() - start > quietMs) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function push(sock, action, expectTypes) {
  await quiet(sock);
  const mark = sock.events.length;
  const res = await action();
  if (res && res.status >= 400) throw new Error(`the write itself failed: HTTP ${res.status} ${res.text?.slice(0, 160)}`);
  let hit = null;
  try {
    await until(() => (hit = sock.events.slice(mark).find((e) => expectTypes.includes('*') || expectTypes.includes(e.type)) ?? null), { maxMs: WAIT_MS, stepMs: 60 });
  } catch {
    const got = sock.events.slice(mark).map((e) => e.type);
    throw new Error(`no live event (${expectTypes.join(' / ')}) within ${WAIT_MS} ms${got.length ? `; got only: ${got.join(', ')}` : ''}`);
  }
  return hit;
}

t('Owner', 'Live updates: setup', 'Open sockets: owner (branch A), second branch B, other restaurant', async (ctx) => {
  needSockets();
  ctx.lv = {};
  ctx.lv.ownerA = await openSocket(ctx.owner.token, ctx.branchId);
  ctx.lv.rivalSock = await openSocket(ctx.rival.token, ctx.rivalBranchId);
  const br = await ctx.owner.post('/v1/branches', { name: 'Branch B', slug: `bb-${config.runId}`, timezone: 'Asia/Riyadh', currency: 'SAR', taxRateBp: 0, taxInclusive: false, dayStartHour: 4 });
  if (br.status === 201) {
    ctx.lv.branchB = br.body.id;
    ctx.lv.ownerB = await openSocket(ctx.owner.token, br.body.id);
  }
});

// ---------------------------------------------------------------- catalog writes -> catalog.updated

const CAT = 'Live updates: catalog';
const cases = [];
const catalog = (name, fn) => cases.push([CAT, 'Owner', name, fn, ['catalog.updated']]);

catalog('POST /categories', (c) => c.owner.post('/v1/categories', { name: { en: 'LV cat', ar: 'تصنيف' } }));
catalog('PATCH /categories/:id', (c) => c.owner.patch(`/v1/categories/${c.lv.cat}`, { name: { en: 'LV cat 2', ar: 'تصنيف 2' } }));
catalog('PUT /categories/reorder', async (c) => { const ids = (await c.owner.get('/v1/categories')).body.items.map((x) => x.id).reverse(); return c.owner.put('/v1/categories/reorder', { orderedIds: ids }); });
catalog('POST /products', async (c) => { const r = await c.owner.post('/v1/products', { categoryId: c.lv.cat, name: { en: 'LV prod', ar: 'منتج' }, priceMinor: 100 }); c.lv.prod = r.body?.id; return r; });
catalog('PATCH /products/:id (price)', (c) => c.owner.patch(`/v1/products/${c.lv.prod}`, { priceMinor: 200 }));
catalog('PATCH /products/:id (availability)', (c) => c.owner.patch(`/v1/products/${c.lv.prod}`, { isActive: false }));
catalog('PUT /products/reorder', (c) => c.owner.put('/v1/products/reorder', { categoryId: c.lv.cat, orderedIds: [c.lv.prod] }));
catalog('POST /products/:id/image', async (c) => { const r = await c.owner.post(`/v1/products/${c.lv.prod}/image`, pngForm()); if (r.status >= 500) skip('image storage not available'); return r; });
catalog('DELETE /products/:id/image', (c) => c.owner.delete(`/v1/products/${c.lv.prod}/image`));
catalog('POST /modifier-groups', async (c) => { const r = await c.owner.post('/v1/modifier-groups', { name: { en: 'LV group', ar: 'مجموعة' }, minSelect: 0, maxSelect: 2 }); c.lv.grp = r.body?.id; return r; });
catalog('POST /modifier-groups/:id/modifiers', async (c) => { const r = await c.owner.post(`/v1/modifier-groups/${c.lv.grp}/modifiers`, { name: { en: 'LV mod', ar: 'خيار' }, priceDeltaMinor: 50 }); c.lv.mod = r.body?.id; return r; });
catalog('PATCH /modifier-groups/:id/modifiers/:id', (c) => c.owner.patch(`/v1/modifier-groups/${c.lv.grp}/modifiers/${c.lv.mod}`, { priceDeltaMinor: 75 }));
catalog('PUT /modifier-groups/:id/modifiers/reorder', (c) => c.owner.put(`/v1/modifier-groups/${c.lv.grp}/modifiers/reorder`, { orderedIds: [c.lv.mod] }));
catalog('PATCH /modifier-groups/:id', (c) => c.owner.patch(`/v1/modifier-groups/${c.lv.grp}`, { maxSelect: 3 }));
catalog('PUT /products/:id/modifier-groups (attach)', (c) => c.owner.put(`/v1/products/${c.lv.prod}/modifier-groups`, { groupIds: [c.lv.grp] }));
catalog('DELETE /modifier-groups/:id/modifiers/:id', (c) => c.owner.delete(`/v1/modifier-groups/${c.lv.grp}/modifiers/${c.lv.mod}`));
catalog('DELETE /modifier-groups/:id', (c) => c.owner.delete(`/v1/modifier-groups/${c.lv.grp}`));
catalog('DELETE /products/:id', (c) => c.owner.delete(`/v1/products/${c.lv.prod}`));
catalog('DELETE /categories/:id', (c) => c.owner.delete(`/v1/categories/${c.lv.cat}`));

// ---------------------------------------------------------------- order writes -> order.*

const ORD = 'Live updates: orders';
const ORDER_EVENTS = ['order.placed', 'order.updated', 'order.item_updated'];
const orderCase = (name, fn) => cases.push([ORD, 'Cashier', name, fn, ORDER_EVENTS]);
const B = (c) => `/v1/branches/${c.branchId}`;

orderCase('POST /orders (create)', async (c) => { const r = await createOrder(c.cashier, c.branchId, orderBody([item(c.cola.id, 1), item(c.cola.id, 2), item(c.cola.id, 3)])); c.lv.o = r.body; return r; });
orderCase('POST /orders/:id/items (add items)', async (c) => { const r = await c.cashier.post(`${B(c)}/orders/${c.lv.o.id}/items`, { expectedVersion: c.lv.o.version, items: [item(c.cola.id)] }); c.lv.o = r.body; return r; });
orderCase('POST /orders/:id/items/:id/void', async (c) => { const r = await c.owner.post(`${B(c)}/orders/${c.lv.o.id}/items/${c.lv.o.items[0].id}/void`, { expectedVersion: c.lv.o.version, reason: 'lv' }); c.lv.o = (await getOrder(c.cashier, c.branchId, c.lv.o.id)).body; return r; });
orderCase('POST /orders/:id/payments (partial cash)', async (c) => { const r = await payOrder(c.cashier, c.branchId, c.lv.o, { amountMinor: 500, tenderedMinor: 500 }); c.lv.o = (await getOrder(c.cashier, c.branchId, c.lv.o.id)).body; return r; });
orderCase('POST /orders/:id/status (preparing)', async (c) => { const r = await setStatus(c.kitchen, c.branchId, c.lv.o, 'preparing'); c.lv.o = (await getOrder(c.cashier, c.branchId, c.lv.o.id)).body; return r; });
orderCase('POST /orders/:id/items/:id/status (kitchen ticks an item)', async (c) => { const live = c.lv.o.items.find((i) => !i.voidedAt); const r = await c.kitchen.post(`${B(c)}/orders/${c.lv.o.id}/items/${live.id}/status`, { to: 'ready', expectedVersion: c.lv.o.version }); c.lv.o = (await getOrder(c.cashier, c.branchId, c.lv.o.id)).body; return r; });
orderCase('POST /orders/:id/status (cancel)', async (c) => {
  const o = (await createOrder(c.cashier, c.branchId, orderBody([item(c.cola.id)]))).body;
  await new Promise((r) => setTimeout(r, 800));
  return setStatus(c.owner, c.branchId, o, 'cancelled', { reason: 'lv' });
});
orderCase('POST /orders/:id/move-table', async (c) => {
  const o = (await createOrder(c.cashier, c.branchId, orderBody([item(c.cola.id)], { type: 'dine_in', tableId: c.table1.id }))).body;
  const t2 = c.table2.id;
  await new Promise((r) => setTimeout(r, 400));
  return c.cashier.post(`${B(c)}/orders/${o.id}/move-table`, { expectedVersion: o.version, tableId: t2 });
});
orderCase('POST /bills/:id/payments + /close (table bill)', async (c) => {
  const tbl = (await c.owner.post(`${B(c)}/tables`, { label: 'LV bill ' + uuid().slice(0, 4) })).body;
  const o = (await createOrder(c.cashier, c.branchId, orderBody([item(c.cola.id)], { type: 'dine_in', tableId: tbl.id }))).body;
  const bill = (await c.cashier.get(`${B(c)}/bills/${o.billId}`)).body;
  await new Promise((r) => setTimeout(r, 400));
  const pid = uuid();
  return c.cashier.post(`${B(c)}/bills/${o.billId}/payments`, { clientPaymentId: pid, method: 'cash', amountMinor: bill.dueMinor, tenderedMinor: bill.dueMinor }, { headers: { 'Idempotency-Key': pid } });
});

// ---------------------------------------------------------------- everything else: no event exists today

const SET = 'Live updates: settings, staff, tables, plan';
const gap = (name, who, fn) => cases.push([SET, who, name, fn, ['*']]);

gap('PATCH /branches/:id (card payments / tax / pay-before-send)', 'Owner', async (c) => { const r = await c.owner.patch(`${B(c)}`, { acceptsCard: false }); c.lv.revert = () => c.owner.patch(`${B(c)}`, { acceptsCard: true }); return r; });
gap('PATCH /branches/:id (pager on/off)', 'Owner', (c) => c.owner.patch(`${B(c)}`, { pagerEnabled: false }));
gap('POST /branches/:id/tables (new table)', 'Owner', (c) => c.owner.post(`${B(c)}/tables`, { label: 'LV T' }));
gap('PATCH /branches/:id/tables/:id (rename / disable)', 'Owner', (c) => c.owner.patch(`${B(c)}/tables/${c.table2.id}`, { label: 'T2-lv' }));
gap('POST /tables/:id/rotate-qr', 'Owner', (c) => c.owner.post(`${B(c)}/tables/${c.table2.id}/rotate-qr`));
gap('PATCH /org/settings (display currency and rate)', 'Owner', async (c) => { const r = await c.owner.patch('/v1/org/settings', { displayCurrency: 'USD', exchangeRate: 0.27 }); c.lv.revert = () => c.owner.patch('/v1/org/settings', { displayCurrency: null }); return r; });
gap('PATCH /org/settings (restaurant name / languages)', 'Owner', (c) => c.owner.patch('/v1/org/settings', { name: `E2E LV ${config.runId}` }));
gap('PATCH /org/settings (menu look)', 'Owner', (c) => c.owner.patch('/v1/org/settings', { menuTheme: { preset: 'classic', layout: 'list' } }));
gap('PATCH /staff/:id (disable / enable a staff member)', 'Owner', async (c) => { const r = await c.owner.patch(`/v1/staff/${c.rtCashierId}`, { status: 'disabled' }); c.lv.revert = () => c.owner.patch(`/v1/staff/${c.rtCashierId}`, { status: 'active' }); return r; });
gap('PATCH /staff/:id (role change)', 'Owner', (c) => c.owner.patch(`/v1/staff/${c.rtCashierId}`, { roleKey: 'kitchen' }));
gap('PUT /staff/:id/permissions (grant / deny)', 'Owner', (c) => c.owner.put(`/v1/staff/${c.cashierId}/permissions`, { grant: [], deny: [] }));
gap('PUT /staff/:id/pin (change PIN)', 'Owner', (c) => c.owner.put(`/v1/staff/${c.managerId}/pin`, { pin: '7391' }));
gap('POST /devices (add POS device)', 'Owner', async (c) => { const r = await c.owner.post('/v1/devices', { branchId: c.branchId, name: 'LV tablet' }); c.lv.dev = r.body?.device?.id; return r; });
gap('DELETE /devices/:id (revoke POS device)', 'Owner', (c) => c.owner.delete(`/v1/devices/${c.lv.dev}`));
gap('POST /branches/:id/display-link/rotate (Ready screen link)', 'Owner', (c) => c.owner.post(`${B(c)}/display-link/rotate`));
gap('Admin plan change (menu plan)', 'Platform admin', async (c) => {
  if (!config.adminEmail) skip('no platform admin credentials');
  const res = await new Client().post('/v1/admin/auth/login', { email: config.adminEmail, password: config.adminPassword });
  const admin = new Client(res.body.accessToken);
  c.lv.admin = admin;
  return admin.post(`/v1/admin/orgs/${c.orgId}/activate`, { planKey: 'menu', until: new Date(Date.now() + 864e5).toISOString(), paid: false });
});
gap('Admin plan change back (restaurant plan)', 'Platform admin', async (c) => {
  if (!c.lv.admin) skip('no platform admin credentials');
  return c.lv.admin.post(`/v1/admin/orgs/${c.orgId}/activate`, { planKey: 'restaurant', until: new Date(Date.now() + 864e5).toISOString(), paid: false });
});

for (const [feature, role, name, fn, types] of cases) {
  t(role, feature, `${name} -> live event`, async (ctx) => {
    needSockets();
    const sock = ctx.lv.ownerA;
    if (feature === CAT && name === 'POST /categories') ctx.lv.cat = undefined;
    const hit = await push(sock, async () => {
      const res = await fn(ctx);
      if (name === 'POST /categories' && res?.body?.id) ctx.lv.cat = res.body.id;
      return res;
    }, types);
    ctx.lv.lastHit = hit;
    if (ctx.lv.revert) { const r = ctx.lv.revert; ctx.lv.revert = null; await r(); }
    if (name.startsWith('Admin plan change (menu')) await new Promise((r) => setTimeout(r, 200));
  });
}

// ---------------------------------------------------------------- right place

const WHERE = 'Live updates: right place';

t('Owner', WHERE, 'Order in branch A is NOT pushed to branch B', async (ctx) => {
  needSockets();
  if (!ctx.lv.ownerB) skip('second branch not allowed on this plan');
  const mark = ctx.lv.ownerB.events.length;
  expectStatus(await createOrder(ctx.cashier, ctx.branchId, orderBody([item(ctx.cola.id)])), 201);
  await new Promise((r) => setTimeout(r, 800));
  const leaked = ctx.lv.ownerB.events.slice(mark).filter((e) => e.type.startsWith('order.'));
  assert.equal(leaked.length, 0, `branch B received ${leaked.map((e) => e.type).join(', ')}`);
});

t('Owner', WHERE, 'Catalog change IS pushed to every branch of the restaurant', async (ctx) => {
  needSockets();
  if (!ctx.lv.ownerB) skip('second branch not allowed on this plan');
  const mark = ctx.lv.ownerB.events.length;
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { priceMinor: 901 }), 200);
  await ctx.lv.ownerB.waitFor('catalog.updated', () => true, WAIT_MS, mark);
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { priceMinor: 900 }), 200);
});

t('Owner', WHERE, 'Another restaurant receives nothing from any of the writes above', async (ctx) => {
  needSockets();
  assert.equal(ctx.lv.rivalSock.events.length, 0, `other restaurant got: ${ctx.lv.rivalSock.events.map((e) => e.type).join(', ')}`);
});

t('Owner', WHERE, 'Event payloads carry no customer or staff personal data', async (ctx) => {
  needSockets();
  const text = JSON.stringify(ctx.lv.ownerA.events.map((e) => e.payload));
  for (const bad of ['password', 'pin', '@example.com', 'Walk-in']) assert.ok(!text.toLowerCase().includes(bad.toLowerCase()), `payload contains "${bad}"`);
});

t('Owner', WHERE, 'Closing sockets', async (ctx) => {
  for (const s of ['ownerA', 'ownerB', 'rivalSock']) ctx.lv?.[s]?.close();
});
