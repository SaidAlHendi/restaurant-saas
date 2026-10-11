import { sql } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';

import {
  asDemoKitchen,
  asDemoOwner,
  asOtherOwner,
  categoryBody,
  productBody,
} from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { seedCatalogProduct } from './ordering-helpers';

function postOrder(
  client: Agent,
  branchId: string,
  body: {
    clientOrderId: string;
    type: 'takeaway' | 'dine_in';
    tableId?: string;
    items: Array<{ productId: string; quantity: number; modifierIds: string[] }>;
  },
  idempotencyKey?: string,
) {
  const base = client.post(`/v1/branches/${branchId}/orders`);
  const req = idempotencyKey === undefined ? base : base.set('Idempotency-Key', idempotencyKey);
  return req.send(body);
}

function postPayment(
  client: Agent,
  branchId: string,
  orderId: string,
  body: {
    clientPaymentId: string;
    expectedVersion: number;
    method: 'cash' | 'card' | 'other';
    amountMinor: number;
    tenderedMinor?: number;
  },
  idempotencyKey?: string,
) {
  const base = client.post(`/v1/branches/${branchId}/orders/${orderId}/payments`);
  const key = idempotencyKey ?? body.clientPaymentId;
  return base.set('Idempotency-Key', key).send(body);
}

async function countPayments(db: DrizzleDb, orgId: string, orderId: string): Promise<number> {
  let count = 0;
  await withOrg(db, orgId, async (tx) => {
    const row = await tx.execute(
      sql`SELECT count(*)::int AS c FROM payments WHERE order_id = ${orderId}::uuid`,
    );
    count = (row.rows[0] as { c: number }).c;
  });
  return count;
}

describe('Ordering payments (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;
  let branchId = '';
  let orgId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    db = app.get(DRIZZLE);
    const owner = await asDemoOwner(apiAgent(app));
    const me = await owner.get('/v1/me');
    branchId =
      (me.body as { branches: Array<{ id: string; isActive: boolean }> }).branches.find(
        (b) => b.isActive,
      )?.id ?? '';
    orgId = (me.body as { org: { id: string } }).org.id;
    if (!branchId) {
      throw new Error('no branch');
    }
    ({ productId } = await seedCatalogProduct(agent));
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTakeawayOrder(client: Agent): Promise<{
    orderId: string;
    version: number;
    totalMinor: number;
  }> {
    const clientOrderId = newUuidV7();
    const res = await postOrder(
      client,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        customerName: `Pay-${newUuidV7().slice(-8)}`,
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(res.status).toBe(201);
    const body = res.body as { id: string; version: number; totalMinor: number };
    return { orderId: body.id, version: body.version, totalMinor: body.totalMinor };
  }

  it('cash payment with change', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const clientPaymentId = newUuidV7();
    const res = await postPayment(owner, branchId, orderId, {
      clientPaymentId,
      expectedVersion: version,
      method: 'cash',
      amountMinor: totalMinor,
      tenderedMinor: totalMinor + 500,
    });
    expect(res.status).toBe(201);
    const payment = res.body as {
      changeMinor: number;
      tenderedMinor: number;
      amountMinor: number;
    };
    expect(payment.amountMinor).toBe(totalMinor);
    expect(payment.changeMinor).toBe(500);
    expect(payment.tenderedMinor).toBe(totalMinor + 500);
  });

  it('card payment without tendered', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const clientPaymentId = newUuidV7();
    const res = await postPayment(owner, branchId, orderId, {
      clientPaymentId,
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor,
    });
    expect(res.status).toBe(201);
  });

  it('partial then full payment marks order paid', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const half = Math.floor(totalMinor / 2);
    const rest = totalMinor - half;
    const pay1 = await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: half,
    });
    expect(pay1.status).toBe(201);
    const afterPartial = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    expect((afterPartial.body as { paymentStatus: string }).paymentStatus).toBe('partial');
    const v2 = (afterPartial.body as { version: number }).version;
    const pay2 = await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: v2,
      method: 'card',
      amountMinor: rest,
    });
    expect(pay2.status).toBe(201);
    const afterPaid = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    expect((afterPaid.body as { paymentStatus: string }).paymentStatus).toBe('paid');
  });

  it('422 when payment exceeds due', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const res = await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor + 1,
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('PAYMENT_EXCEEDS_DUE');
  });

  it('422 when cash tendered is less than amount', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const res = await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'cash',
      amountMinor: totalMinor,
      tenderedMinor: totalMinor - 1,
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('PAYMENT_TENDERED_INSUFFICIENT');
  });

  it('200 idempotent repeat returns same payment without version check', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const clientPaymentId = newUuidV7();
    const first = await postPayment(owner, branchId, orderId, {
      clientPaymentId,
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor,
    });
    expect(first.status).toBe(201);
    const paymentId = (first.body as { id: string }).id;
    const repeat = await postPayment(owner, branchId, orderId, {
      clientPaymentId,
      expectedVersion: 1,
      method: 'card',
      amountMinor: totalMinor,
    });
    expect(repeat.status).toBe(200);
    expect((repeat.body as { id: string }).id).toBe(paymentId);
    expect(await countPayments(db, orgId, orderId)).toBe(1);
  });

  it('409 stale expectedVersion on new clientPaymentId', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const res = await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version + 99,
      method: 'card',
      amountMinor: totalMinor,
    });
    expect(res.status).toBe(409);
  });

  it('422 payment on cancelled order', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'test cancel',
    });
    const res = await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version + 1,
      method: 'card',
      amountMinor: totalMinor,
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('ORDER_NOT_PAYABLE');
  });

  it('422 void after payment', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const detail = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    const itemId = (detail.body as { items: Array<{ id: string }> }).items[0]?.id;
    if (!itemId) {
      throw new Error('no item');
    }
    await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor,
    });
    const afterPay = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    const v2 = (afterPay.body as { version: number }).version;
    const voidRes = await owner.post(
      `/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/void`,
    ).send({ expectedVersion: v2, reason: 'mistake' });
    expect(voidRes.status).toBe(422);
    expect((voidRes.body as { error: { code: string } }).error.code).toBe('ORDER_HAS_PAYMENTS');
  });

  it('422 cancel order with captured payment', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor,
    });
    const afterPay = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    const v2 = (afterPay.body as { version: number }).version;
    const cancel = await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: v2,
      reason: 'try cancel paid',
    });
    expect(cancel.status).toBe(422);
    expect((cancel.body as { error: { code: string } }).error.code).toBe('ORDER_HAS_PAYMENTS');
  });

  it('422 complete when unpaid and 200 when paid', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'preparing',
      expectedVersion: version,
    });
    const prep = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    const v2 = (prep.body as { version: number }).version;
    await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'ready',
      expectedVersion: v2,
    });
    const ready = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    const v3 = (ready.body as { version: number }).version;
    const unpaidComplete = await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'completed',
      expectedVersion: v3,
    });
    expect(unpaidComplete.status).toBe(422);
    expect((unpaidComplete.body as { error: { code: string } }).error.code).toBe('ORDER_NOT_PAID');

    await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: v3,
      method: 'card',
      amountMinor: totalMinor,
    });
    const paid = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    const v4 = (paid.body as { version: number }).version;
    const complete = await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'completed',
      expectedVersion: v4,
    });
    expect(complete.status).toBe(201);
  });

  it('add items after paid moves payment_status to partial', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor,
    });
    const paid = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    const v2 = (paid.body as { version: number }).version;
    const add = await owner.post(`/v1/branches/${branchId}/orders/${orderId}/items`).send({
      expectedVersion: v2,
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    expect(add.status).toBe(201);
    expect((add.body as { paymentStatus: string }).paymentStatus).toBe('partial');
  });

  it('404 other tenant order payment', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const other = await asOtherOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const res = await postPayment(other, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor,
    });
    expect(res.status).toBe(404);
  });

  it('403 kitchen cannot post payments', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const kitchen = await asDemoKitchen(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const res = await postPayment(kitchen, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor,
    });
    expect(res.status).toBe(403);
  });

  it('concurrent duplicate clientPaymentId returns 201 and 200 without error', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const owner = await asDemoOwner(apiAgent(app));
      const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
      const clientPaymentId = newUuidV7();
      const payload = {
        clientPaymentId,
        expectedVersion: version,
        method: 'card' as const,
        amountMinor: totalMinor,
      };
      const [first, second] = await Promise.all([
        postPayment(owner, branchId, orderId, payload),
        postPayment(owner, branchId, orderId, payload),
      ]);
      const statuses = [first.status, second.status].sort((a, b) => a - b);
      expect(statuses).toEqual([200, 201]);
      expect(await countPayments(db, orgId, orderId)).toBe(1);
    }
  });

  it('activeOnly=false with status=completed returns completed orders', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: totalMinor,
    });
    let order = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    let v = (order.body as { version: number }).version;
    await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'preparing',
      expectedVersion: v,
    });
    order = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    v = (order.body as { version: number }).version;
    await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'ready',
      expectedVersion: v,
    });
    order = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    v = (order.body as { version: number }).version;
    await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'completed',
      expectedVersion: v,
    });

    const completedList = await owner
      .get(`/v1/branches/${branchId}/orders`)
      .query({ activeOnly: false, status: 'completed', limit: 100 });
    expect(completedList.status).toBe(200);
    const completedIds = (completedList.body as { items: Array<{ id: string }> }).items.map(
      (row) => row.id,
    );
    expect(completedIds.includes(orderId)).toBe(true);

    const activeList = await owner
      .get(`/v1/branches/${branchId}/orders`)
      .query({ activeOnly: true, limit: 100 });
    const activeIds = (activeList.body as { items: Array<{ id: string }> }).items.map((row) => row.id);
    expect(activeIds.includes(orderId)).toBe(false);
  });

  it('completes zero-total order without payment after voiding a free line', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const cat = await owner.post('/v1/categories').send(categoryBody());
    const categoryId = (cat.body as { id: string }).id;
    const prod = await owner.post('/v1/products').send(productBody(categoryId, 0));
    const freeProductId = (prod.body as { id: string }).id;
    const clientOrderId = newUuidV7();
    const placed = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        customerName: `Zero-${newUuidV7().slice(-8)}`,
        items: [
          { productId: freeProductId, quantity: 1, modifierIds: [] },
          { productId: freeProductId, quantity: 1, modifierIds: [] },
        ],
      },
      clientOrderId,
    );
    expect(placed.status).toBe(201);
    const orderId = (placed.body as { id: string }).id;
    let version = (placed.body as { version: number }).version;
    const itemId = (placed.body as { items: Array<{ id: string }> }).items[0]?.id;
    if (!itemId) {
      throw new Error('missing item');
    }
    const voided = await owner
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/void`)
      .send({ expectedVersion: version, reason: 'duplicate free item' });
    expect(voided.status).toBe(201);
    version = (voided.body as { version: number; totalMinor: number; paymentStatus: string }).version;
    expect((voided.body as { totalMinor: number }).totalMinor).toBe(0);
    expect((voided.body as { paymentStatus: string }).paymentStatus).toBe('paid');

    await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'preparing',
      expectedVersion: version,
    });
    const preparing = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    version = (preparing.body as { version: number }).version;
    await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'ready',
      expectedVersion: version,
    });
    const ready = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    version = (ready.body as { version: number }).version;
    const completed = await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'completed',
      expectedVersion: version,
    });
    expect(completed.status).toBe(201);
    expect((completed.body as { status: string }).status).toBe('completed');
  });

  it('activeOnly lists open orders without businessDate filter', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId } = await createTakeawayOrder(owner);
    const list = await owner.get(`/v1/branches/${branchId}/orders`).query({ activeOnly: true, limit: 100 });
    expect(list.status).toBe(200);
    const ids = (list.body as { items: Array<{ id: string }> }).items.map((i) => i.id);
    expect(ids.includes(orderId)).toBe(true);
  });

  it('list and get include paidMinor and dueMinor', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { orderId, version, totalMinor } = await createTakeawayOrder(owner);
    const half = Math.floor(totalMinor / 2);
    await postPayment(owner, branchId, orderId, {
      clientPaymentId: newUuidV7(),
      expectedVersion: version,
      method: 'card',
      amountMinor: half,
    });
    const get = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    expect((get.body as { paidMinor: number; dueMinor: number }).paidMinor).toBe(half);
    expect((get.body as { dueMinor: number }).dueMinor).toBe(totalMinor - half);
    const list = await owner.get(`/v1/branches/${branchId}/orders`).query({ limit: 100 });
    const row = (list.body as { items: Array<{ id: string; paidMinor: number }> }).items.find(
      (i) => i.id === orderId,
    );
    expect(row?.paidMinor).toBe(half);
  });
});
