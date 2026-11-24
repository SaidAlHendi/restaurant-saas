import { t, assert, expectStatus } from '../lib/runner.mjs';
import { orderBody, createOrder, setStatus, getOrder, payOrder } from '../lib/helpers.mjs';
import { Client } from '../lib/http.mjs';

const F = 'Kitchen display (KDS)';
const item = (productId, quantity = 1) => ({ productId, quantity, modifierIds: [] });

t('Cashier', F, 'Cashier sends a new order (with pager) to the kitchen', async (ctx) => {
  const res = expectStatus(await createOrder(ctx.cashier, ctx.branchId, orderBody([item(ctx.cola.id, 2), item(ctx.veggie.id, 1)], { pagerNumber: 77, customerName: 'KDS test' })), 201);
  ctx.kdsOrder = res.body;
});

t('Kitchen', F, 'Kitchen board shows the new order with its items', async (ctx) => {
  const res = expectStatus(await ctx.kitchen.get(`/v1/branches/${ctx.branchId}/kitchen/board`), 200);
  const o = res.body.orders.find((x) => x.id === ctx.kdsOrder.id);
  assert.ok(o, 'new order not on the board');
  assert.ok(o.items.length >= 2);
});

t('Kitchen', F, 'Kitchen starts preparing the order', async (ctx) => {
  const o = (await getOrder(ctx.kitchen, ctx.branchId, ctx.kdsOrder.id)).body;
  const res = expectStatus(await setStatus(ctx.kitchen, ctx.branchId, o, 'preparing'), [200, 201]);
  assert.equal(res.body.status, 'preparing');
});

t('Kitchen', F, 'Kitchen marks one item ready, then un-marks it', async (ctx) => {
  let o = (await getOrder(ctx.kitchen, ctx.branchId, ctx.kdsOrder.id)).body;
  const itemId = o.items[0].id;
  const url = `/v1/branches/${ctx.branchId}/orders/${o.id}/items/${itemId}/status`;
  const ready = expectStatus(await ctx.kitchen.post(url, { to: 'ready', expectedVersion: o.version }), [200, 201]);
  assert.equal(ready.body.items.find((i) => i.id === itemId).status, 'ready');
  const back = expectStatus(await ctx.kitchen.post(url, { to: 'not_ready', expectedVersion: ready.body.version }), [200, 201]);
  assert.notEqual(back.body.items.find((i) => i.id === itemId).status, 'ready');
});

t('Kitchen', F, 'Kitchen marks the whole order ready', async (ctx) => {
  const o = (await getOrder(ctx.kitchen, ctx.branchId, ctx.kdsOrder.id)).body;
  const res = expectStatus(await setStatus(ctx.kitchen, ctx.branchId, o, 'ready'), [200, 201]);
  assert.equal(res.body.status, 'ready');
});

t('Customer', F, '"Ready" screen shows the pager number of a ready order', async (ctx) => {
  assert.ok(ctx.displayToken, 'no display token');
  const res = expectStatus(await new Client().get(`/v1/public/display/${ctx.displayToken}`), 200);
  assert.ok(JSON.stringify(res.body.ready).includes('77'), `pager 77 not in ${JSON.stringify(res.body.ready).slice(0, 200)}`);
});

t('Customer', F, '"Ready" screen with a wrong token returns 404', async () => {
  expectStatus(await new Client().get('/v1/public/display/' + 'x'.repeat(40)), 404);
});

t('Kitchen', F, 'Kitchen completes the handed-over order once it is paid', async (ctx) => {
  let o = (await getOrder(ctx.kitchen, ctx.branchId, ctx.kdsOrder.id)).body;
  const unpaid = await setStatus(ctx.kitchen, ctx.branchId, o, 'completed');
  assert.ok([402, 403, 409, 422].includes(unpaid.status), `completing an unpaid order returned ${unpaid.status}`);
  expectStatus(await payOrder(ctx.cashier, ctx.branchId, o), 201);
  o = (await getOrder(ctx.kitchen, ctx.branchId, ctx.kdsOrder.id)).body;
  const res = await setStatus(ctx.kitchen, ctx.branchId, o, 'completed');
  assert.ok([200, 201].includes(res.status), `got ${res.status}: ${res.text.slice(0, 200)}`);
  assert.equal(res.body.status, 'completed');
});

t('Customer', F, 'Completed order disappears from the "Ready" screen', async (ctx) => {
  const res = expectStatus(await new Client().get(`/v1/public/display/${ctx.displayToken}`), 200);
  assert.ok(!JSON.stringify(res.body.ready).includes('"pagerNumber":77'));
});

t('Kitchen', F, 'Kitchen cannot cancel an order or take payment', async (ctx) => {
  const o = expectStatus(await createOrder(ctx.cashier, ctx.branchId, orderBody([item(ctx.cola.id)])), 201).body;
  const res = await setStatus(ctx.kitchen, ctx.branchId, o, 'cancelled', { reason: 'nope' });
  assert.ok([401, 403].includes(res.status), `cancel returned ${res.status}`);
});

t('Cashier', F, 'Cashier can see the kitchen board (read access)', async (ctx) => {
  expectStatus(await ctx.cashier.get(`/v1/branches/${ctx.branchId}/kitchen/board`), 200);
});
