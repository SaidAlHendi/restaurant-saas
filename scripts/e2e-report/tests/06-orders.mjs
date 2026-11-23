import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { uuid } from '../lib/http.mjs';
import { orderBody, createOrder, payOrder, setStatus, getOrder } from '../lib/helpers.mjs';

const F = 'Orders & POS';
const item = (productId, quantity = 1, modifierIds = [], extra = {}) => ({ productId, quantity, modifierIds, ...extra });
const bp = (ctx) => ctx.branchId;

t('Cashier', F, 'POS menu lists active categories and products for the branch', async (ctx) => {
  const res = expectStatus(await ctx.cashier.get(`/v1/branches/${bp(ctx)}/pos/menu`), 200);
  assert.ok(JSON.stringify(res.body).includes(ctx.burger.id));
});

t('Cashier', F, 'Cashier creates a takeaway order; totals include 15% tax', async (ctx) => {
  const body = orderBody([item(ctx.cola.id, 2)], { customerName: 'Walk-in' });
  const res = expectStatus(await createOrder(ctx.cashier, bp(ctx), body), 201);
  const o = res.body;
  assert.equal(o.status, 'placed');
  assert.equal(o.paymentStatus, 'unpaid');
  assert.equal(o.subtotalMinor, 1800);
  assert.equal(o.taxMinor, 270);
  assert.equal(o.totalMinor, 2070);
  assert.ok(o.orderNumber >= 1);
  ctx.order1 = o;
});

t('Cashier', F, 'Same Idempotency-Key returns the same order (no duplicate)', async (ctx) => {
  const body = orderBody([item(ctx.cola.id)]);
  const a = expectStatus(await createOrder(ctx.cashier, bp(ctx), body), 201);
  const b = await createOrder(ctx.cashier, bp(ctx), body);
  assert.ok([200, 201].includes(b.status), `replay returned ${b.status}`);
  assert.equal(b.body.id, a.body.id);
});

t('Cashier', F, 'Idempotency-Key that differs from clientOrderId is rejected', async (ctx) => {
  const body = orderBody([item(ctx.cola.id)]);
  const res = await ctx.cashier.post(`/v1/branches/${bp(ctx)}/orders`, body, { headers: { 'Idempotency-Key': uuid() } });
  assert.ok([400, 422].includes(res.status), `got ${res.status}`);
});

t('Cashier', F, 'Order with no items or quantity 0 is rejected', async (ctx) => {
  expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([])), 400);
  expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id, 0)])), 400);
});

t('Cashier', F, 'Order with an unknown product is rejected', async (ctx) => {
  const res = await createOrder(ctx.cashier, bp(ctx), orderBody([item(uuid())]));
  assert.ok([400, 404, 422].includes(res.status), `got ${res.status}`);
});

t('Cashier', F, 'Required modifier group: missing selection is rejected', async (ctx) => {
  const res = await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.burger.id)]));
  assert.ok([400, 422].includes(res.status), `expected 400/422 got ${res.status}`);
});

t('Cashier', F, 'Required modifier chosen: price delta is added to the line', async (ctx) => {
  const res = expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.burger.id, 1, [ctx.modLarge], { notes: 'no pickles' })])), 201);
  assert.equal(res.body.subtotalMinor, 2500 + ctx.largeDelta);
  ctx.orderBurger = res.body;
});

t('Cashier', F, 'Choosing two options in a max-1 group is rejected', async (ctx) => {
  const res = await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.burger.id, 1, [ctx.modRegular, ctx.modLarge])]));
  assert.ok([400, 422].includes(res.status), `got ${res.status}`);
});

t('Cashier', F, 'Order detail returns items with price snapshots', async (ctx) => {
  const res = expectStatus(await getOrder(ctx.cashier, bp(ctx), ctx.orderBurger.id), 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].modifiers.length, 1);
  assert.equal(res.body.items[0].notes, 'no pickles');
});

t('Cashier', F, 'Changing the product price later does not change an existing order', async (ctx) => {
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { priceMinor: 950 }), 200);
  const res = expectStatus(await getOrder(ctx.cashier, bp(ctx), ctx.order1.id), 200);
  assert.equal(res.body.subtotalMinor, 1800);
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { priceMinor: 900 }), 200);
});

t('Cashier', F, 'Inactive products cannot be ordered', async (ctx) => {
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.veggie.id}`, { isActive: false }), 200);
  const res = await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.veggie.id)]));
  assert.ok([400, 404, 409, 422].includes(res.status), `got ${res.status}`);
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.veggie.id}`, { isActive: true }), 200);
});

t('Cashier', F, 'Dine-in requires a table; takeaway forbids one', async (ctx) => {
  expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)], { type: 'dine_in' })), 400);
  expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)], { tableId: ctx.table1.id })), 400);
});

t('Cashier', F, 'Dine-in order on a table opens a bill', async (ctx) => {
  const res = expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id, 1)], { type: 'dine_in', tableId: ctx.table1.id })), 201);
  assert.equal(res.body.tableId, ctx.table1.id);
  ctx.dineIn = res.body;
});

t('Cashier', F, 'Dine-in on a disabled table is rejected', async (ctx) => {
  const res = await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)], { type: 'dine_in', tableId: ctx.tableOff.id }));
  assert.ok([400, 404, 409, 422].includes(res.status), `got ${res.status}`);
});

t('Cashier', F, 'Pager number is accepted when the branch has pager enabled', async (ctx) => {
  const res = expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)], { pagerNumber: 42 })), 201);
  assert.equal(res.body.pagerNumber, 42);
  ctx.pagerOrder = res.body;
});

t('Cashier', F, 'Pager number is rejected when the branch has pager disabled', async (ctx) => {
  expectStatus(await ctx.owner.patch(`/v1/branches/${bp(ctx)}`, { pagerEnabled: false }), 200);
  const res = await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)], { pagerNumber: 7 }));
  expectStatus(await ctx.owner.patch(`/v1/branches/${bp(ctx)}`, { pagerEnabled: true }), 200);
  assert.equal(res.status, 422, `got ${res.status}`);
  assert.match(res.text, /PAGER_DISABLED/);
});

t('Cashier', F, 'Cashier adds items to an open order', async (ctx) => {
  const o = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  const res = expectStatus(await ctx.cashier.post(`/v1/branches/${bp(ctx)}/orders/${o.id}/items`, { expectedVersion: o.version, items: [item(ctx.cola.id, 1)] }), [200, 201]);
  assert.equal(res.body.subtotalMinor, 2700);
  ctx.order1 = res.body;
});

t('Cashier', F, 'Stale expectedVersion is rejected with a conflict', async (ctx) => {
  const res = await ctx.cashier.post(`/v1/branches/${bp(ctx)}/orders/${ctx.order1.id}/items`, { expectedVersion: 1, items: [item(ctx.cola.id)] });
  assert.equal(res.status, 409, `got ${res.status}`);
});

t('Cashier', F, 'Order list filters by status and returns pagination metadata', async (ctx) => {
  const res = expectStatus(await ctx.cashier.get(`/v1/branches/${bp(ctx)}/orders?status=placed`), 200);
  assert.ok(res.body.items.length >= 3);
  assert.ok(res.body.items.every((o) => o.status === 'placed'));
});

t('Cashier', F, 'Order events log the creation', async (ctx) => {
  const res = expectStatus(await ctx.cashier.get(`/v1/branches/${bp(ctx)}/orders/${ctx.order1.id}/events`), 200);
  assert.ok((res.body.items ?? res.body).length >= 1);
});

t('Cashier', F, 'Cash payment below the amount due is rejected', async (ctx) => {
  const o = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  const res = await payOrder(ctx.cashier, bp(ctx), o, { amountMinor: o.dueMinor, tenderedMinor: 100 });
  assert.ok([400, 422].includes(res.status), `got ${res.status}`);
});

t('Cashier', F, 'Partial cash payment marks the order partial', async (ctx) => {
  const o = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  const res = expectStatus(await payOrder(ctx.cashier, bp(ctx), o, { amountMinor: 1000, tenderedMinor: 1000 }), 201);
  const after = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  assert.equal(after.paymentStatus, 'partial');
  assert.equal(after.dueMinor, o.totalMinor - 1000);
  void res;
});

t('Cashier', F, 'Paying the rest in cash with change marks the order paid', async (ctx) => {
  const o = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  const res = expectStatus(await payOrder(ctx.cashier, bp(ctx), o, { amountMinor: o.dueMinor, tenderedMinor: o.dueMinor + 500 }), 201);
  const after = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  assert.equal(after.paymentStatus, 'paid');
  assert.equal(after.dueMinor, 0);
  const cashPay = after.payments.find((p) => p.changeMinor);
  assert.equal(cashPay.changeMinor, 500);
  void res;
});

t('Cashier', F, 'Overpaying a paid order is rejected', async (ctx) => {
  const o = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  const res = await payOrder(ctx.cashier, bp(ctx), o, { amountMinor: 100, tenderedMinor: 100 });
  assert.ok([400, 409, 422].includes(res.status), `got ${res.status}`);
});

t('Cashier', F, 'Replaying a payment with the same Idempotency-Key does not double-charge', async (ctx) => {
  const o = (await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)]))).body;
  const pid = uuid();
  const body = { clientPaymentId: pid, expectedVersion: o.version, method: 'cash', amountMinor: o.totalMinor, tenderedMinor: o.totalMinor };
  expectStatus(await ctx.cashier.post(`/v1/branches/${bp(ctx)}/orders/${o.id}/payments`, body, { headers: { 'Idempotency-Key': pid } }), 201);
  const again = await ctx.cashier.post(`/v1/branches/${bp(ctx)}/orders/${o.id}/payments`, body, { headers: { 'Idempotency-Key': pid } });
  assert.ok([200, 201].includes(again.status), `replay returned ${again.status}`);
  const after = (await getOrder(ctx.cashier, bp(ctx), o.id)).body;
  assert.equal(after.payments.length, 1);
});

t('Cashier', F, 'Card payment works when the branch accepts cards', async (ctx) => {
  const o = (await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)]))).body;
  expectStatus(await payOrder(ctx.cashier, bp(ctx), o, { method: 'card' }), 201);
});

t('Cashier', F, 'Card payment is rejected when the branch does not accept cards', async (ctx) => {
  expectStatus(await ctx.owner.patch(`/v1/branches/${bp(ctx)}`, { acceptsCard: false }), 200);
  const o = (await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)]))).body;
  const res = await payOrder(ctx.cashier, bp(ctx), o, { method: 'card' });
  expectStatus(await ctx.owner.patch(`/v1/branches/${bp(ctx)}`, { acceptsCard: true }), 200);
  assert.ok([400, 403, 422].includes(res.status), `got ${res.status}`);
});

t('Cashier', F, 'Full status flow: placed, preparing, ready, completed', async (ctx) => {
  let o = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  for (const to of ['preparing', 'ready', 'completed']) {
    const res = expectStatus(await setStatus(ctx.cashier, bp(ctx), o, to), [200, 201]);
    assert.equal(res.body.status, to);
    o = res.body;
  }
  assert.ok(o.completedAt);
});

t('Cashier', F, 'Invalid transition (completed to preparing) is rejected', async (ctx) => {
  const o = (await getOrder(ctx.cashier, bp(ctx), ctx.order1.id)).body;
  const res = await setStatus(ctx.cashier, bp(ctx), o, 'preparing');
  assert.ok([400, 403, 409, 422].includes(res.status), `got ${res.status}`);
});

t('Manager', F, 'Manager reopens a completed order back to ready', async (ctx) => {
  const o = (await getOrder(ctx.manager, bp(ctx), ctx.order1.id)).body;
  const res = expectStatus(await setStatus(ctx.manager, bp(ctx), o, 'ready', { reopen: true, reason: 'Customer returned' }), [200, 201]);
  assert.equal(res.body.status, 'ready');
});

t('Cashier', F, 'Cashier cannot reopen a completed order', async (ctx) => {
  const o = (await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)]))).body;
  let cur = o;
  cur = (await payOrder(ctx.cashier, bp(ctx), cur)).body && (await getOrder(ctx.cashier, bp(ctx), o.id)).body;
  for (const to of ['preparing', 'ready', 'completed']) cur = (await setStatus(ctx.cashier, bp(ctx), cur, to)).body;
  const res = await setStatus(ctx.cashier, bp(ctx), cur, 'ready', { reopen: true, reason: 'x' });
  assert.equal(res.status, 403, `got ${res.status}`);
});

t('Cashier', F, 'Cashier cancelling a sent order needs a manager PIN approval', async (ctx) => {
  const o = (await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)]))).body;
  const noApproval = await setStatus(ctx.cashier, bp(ctx), o, 'cancelled', { reason: 'customer left' });
  assert.ok([401, 403, 422].includes(noApproval.status), `no-approval cancel returned ${noApproval.status}`);
  const wrongPin = await setStatus(ctx.cashier, bp(ctx), o, 'cancelled', { reason: 'customer left', approval: { membershipId: ctx.managerId, pin: '0000' } });
  assert.ok([401, 403, 422, 423].includes(wrongPin.status), `wrong-pin cancel returned ${wrongPin.status}`);
  const ok = expectStatus(await setStatus(ctx.cashier, bp(ctx), (await getOrder(ctx.cashier, bp(ctx), o.id)).body, 'cancelled', {
    reason: 'customer left', approval: { membershipId: ctx.managerId, pin: ctx.managerPin },
  }), [200, 201]);
  assert.equal(ok.body.status, 'cancelled');
  const events = await ctx.cashier.get(`/v1/branches/${bp(ctx)}/orders/${o.id}/events`);
  assert.match(events.text, new RegExp(ctx.managerId), 'approver should be recorded in the event log');
});

t('Manager', F, 'Manager cancels without needing approval', async (ctx) => {
  const o = (await createOrder(ctx.manager, bp(ctx), orderBody([item(ctx.cola.id)]))).body;
  const res = expectStatus(await setStatus(ctx.manager, bp(ctx), o, 'cancelled', { reason: 'test' }), [200, 201]);
  assert.equal(res.body.status, 'cancelled');
});

t('Manager', F, 'Voiding a line: free before the kitchen starts, approval needed after', async (ctx) => {
  const o = (await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id, 1), item(ctx.cola.id, 2), item(ctx.cola.id, 3)]))).body;
  let full = (await getOrder(ctx.cashier, bp(ctx), o.id)).body;
  const voidUrl = (id) => `/v1/branches/${bp(ctx)}/orders/${o.id}/items/${id}/void`;
  const first = expectStatus(await ctx.cashier.post(voidUrl(full.items[0].id), { expectedVersion: full.version, reason: 'typo' }), [200, 201]);
  assert.ok(first.body.items.find((i) => i.id === full.items[0].id)?.voidedAt);
  full = (await getOrder(ctx.cashier, bp(ctx), o.id)).body;
  expectStatus(await setStatus(ctx.cashier, bp(ctx), full, 'preparing'), [200, 201]);
  full = (await getOrder(ctx.cashier, bp(ctx), o.id)).body;
  const noApproval = await ctx.cashier.post(voidUrl(full.items[1].id), { expectedVersion: full.version, reason: 'mistake' });
  assert.ok([401, 403, 422].includes(noApproval.status), `void without approval returned ${noApproval.status}`);
  const withApproval = expectStatus(await ctx.cashier.post(voidUrl(full.items[1].id), {
    expectedVersion: full.version, reason: 'mistake', approval: { membershipId: ctx.managerId, pin: ctx.managerPin },
  }), [200, 201]);
  assert.ok(withApproval.body.items.find((i) => i.id === full.items[1].id)?.voidedAt);
});

t('Manager', F, 'Manager voids a line on a preparing order without approval', async (ctx) => {
  const o = (await createOrder(ctx.manager, bp(ctx), orderBody([item(ctx.cola.id, 1), item(ctx.cola.id, 2)]))).body;
  let full = (await getOrder(ctx.manager, bp(ctx), o.id)).body;
  expectStatus(await setStatus(ctx.manager, bp(ctx), full, 'preparing'), [200, 201]);
  full = (await getOrder(ctx.manager, bp(ctx), o.id)).body;
  expectStatus(await ctx.manager.post(`/v1/branches/${bp(ctx)}/orders/${o.id}/items/${full.items[0].id}/void`, { expectedVersion: full.version, reason: 'out of stock' }), [200, 201]);
});

t('Cashier', F, 'Dine-in: move an order to another table', async (ctx) => {
  const created = expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)], { type: 'dine_in', tableId: ctx.table1.id })), 201).body;
  const res = expectStatus(await ctx.cashier.post(`/v1/branches/${bp(ctx)}/orders/${created.id}/move-table`, { expectedVersion: created.version, tableId: ctx.table2.id }), 200);
  assert.equal(res.body.tableId, ctx.table2.id);
});

t('Cashier', F, 'Dine-in table bill: rounds share one bill, pay, complete, close', async (ctx) => {
  const tbl = expectStatus(await ctx.owner.post(`/v1/branches/${bp(ctx)}/tables`, { label: 'Bill table' }), 201).body;
  const a = expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)], { type: 'dine_in', tableId: tbl.id })), 201).body;
  const b = expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id, 2)], { type: 'dine_in', tableId: tbl.id })), 201).body;
  assert.ok(a.billId, 'dine-in order has no bill');
  assert.equal(a.billId, b.billId, 'two rounds at one table should share a bill');
  const list = expectStatus(await ctx.cashier.get(`/v1/branches/${bp(ctx)}/bills?tableId=${tbl.id}`), 200);
  assert.ok((list.body.items ?? list.body).length >= 1);
  const bill = expectStatus(await ctx.cashier.get(`/v1/branches/${bp(ctx)}/bills/${a.billId}`), 200).body;
  assert.ok(bill.dueMinor > 0);
  const pid = uuid();
  const payBody = { clientPaymentId: pid, method: 'cash', amountMinor: bill.dueMinor, tenderedMinor: bill.dueMinor };
  const pay = expectStatus(await ctx.cashier.post(`/v1/branches/${bp(ctx)}/bills/${a.billId}/payments`, payBody, { headers: { 'Idempotency-Key': pid } }), [200, 201]);
  assert.equal(pay.body.bill.dueMinor, 0);
  const early = await ctx.cashier.post(`/v1/branches/${bp(ctx)}/bills/${a.billId}/close`, {});
  assert.equal(early.status, 422, 'closing while orders are still open must be refused');
  for (const id of [a.id, b.id]) {
    for (const to of ['preparing', 'ready', 'completed']) {
      const cur = (await getOrder(ctx.cashier, bp(ctx), id)).body;
      expectStatus(await setStatus(ctx.cashier, bp(ctx), cur, to), [200, 201]);
    }
  }
  const closed = expectStatus(await ctx.cashier.post(`/v1/branches/${bp(ctx)}/bills/${a.billId}/close`, {}), 200);
  assert.equal(closed.body.status, 'closed');
});

t('Cashier', F, 'Display currency: new order freezes the rate shown to staff', async (ctx) => {
  expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: 'USD', exchangeRate: 0.27, displayItemStep: 0, displayTotalStep: 0 }), 200);
  const o = expectStatus(await createOrder(ctx.cashier, bp(ctx), orderBody([item(ctx.cola.id)])), 201).body;
  assert.ok(o.display, 'order has no display currency block');
  assert.equal(o.display.currency, 'USD');
  expectStatus(await ctx.owner.patch('/v1/org/settings', { exchangeRate: 0.30 }), 200);
  const again = (await getOrder(ctx.cashier, bp(ctx), o.id)).body;
  assert.equal(again.display.rate, o.display.rate, 'rate on an existing order must not change');
  expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: null }), 200);
});

t('Cashier', F, 'Base currency is locked once an order exists', async (ctx) => {
  const res = await ctx.owner.patch('/v1/org/settings', { defaultCurrency: 'USD' });
  assert.ok([400, 409, 422].includes(res.status), `got ${res.status}`);
  const s = await ctx.owner.get('/v1/org/settings');
  assert.equal(s.body.baseCurrencyLocked, true);
});

t('Owner', F, 'Daily sales report reflects the day\'s orders', async (ctx) => {
  const res = expectStatus(await ctx.owner.get(`/v1/branches/${bp(ctx)}/reports/daily`), 200);
  assert.ok(res.body.ordersCount >= 3, `ordersCount ${res.body.ordersCount}`);
  assert.ok(res.body.salesMinor > 0);
  assert.ok(res.body.byPaymentMethod.find((m) => m.method === 'cash').amountMinor > 0);
});

t('Manager', F, 'Manager can read the daily report', async (ctx) => {
  expectStatus(await ctx.manager.get(`/v1/branches/${bp(ctx)}/reports/daily`), 200);
});

t('Cashier', F, 'Cashier cannot read reports', async (ctx) => {
  expectStatus(await ctx.cashier.get(`/v1/branches/${bp(ctx)}/reports/daily`), 403);
});

t('Kitchen', F, 'Kitchen cannot create orders or take payments', async (ctx) => {
  expectStatus(await createOrder(ctx.kitchen, bp(ctx), orderBody([item(ctx.cola.id)])), 403);
  const o = (await getOrder(ctx.owner, bp(ctx), ctx.order1.id)).body;
  expectStatus(await payOrder(ctx.kitchen, bp(ctx), o), 403);
});

t('Owner', F, 'Access to another branch id outside the org is refused', async (ctx) => {
  const res = await ctx.owner.get(`/v1/branches/${uuid()}/orders`);
  assert.ok([403, 404].includes(res.status), `got ${res.status}`);
});

void skip;
