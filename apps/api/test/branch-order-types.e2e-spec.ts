import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import {
  createIsolatedBranch,
  insertDiningTable,
  postOrder,
  seedCatalogProduct,
} from './ordering-helpers';

type BranchRow = { id: string; supportsDineIn: boolean; supportsTakeaway: boolean };

describe('Branch order types (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  function order(
    owner: Agent,
    branchId: string,
    productId: string,
    type: 'takeaway' | 'dine_in',
    tableId?: string,
  ) {
    const clientOrderId = newUuidV7();
    return postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type,
        tableId,
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
  }

  it('defaults both order types to on', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const list = await owner.get('/v1/branches');
    const branch = (list.body as { items: BranchRow[] }).items.find((b) => b.id === branchId);
    expect(branch?.supportsDineIn).toBe(true);
    expect(branch?.supportsTakeaway).toBe(true);
  });

  it('rejects turning both order types off', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const res = await owner
      .patch(`/v1/branches/${branchId}`)
      .send({ supportsDineIn: false, supportsTakeaway: false });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('ORDER_TYPE_REQUIRED');

    // Turning off the second one after the first is also refused (merged with stored state).
    const first = await owner.patch(`/v1/branches/${branchId}`).send({ supportsDineIn: false });
    expect(first.status).toBe(200);
    const second = await owner.patch(`/v1/branches/${branchId}`).send({ supportsTakeaway: false });
    expect(second.status).toBe(422);
    expect(JSON.stringify(second.body)).toContain('ORDER_TYPE_REQUIRED');
  });

  it('rejects takeaway orders when the branch turned takeaway off', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const patched = await owner.patch(`/v1/branches/${branchId}`).send({ supportsTakeaway: false });
    expect(patched.status).toBe(200);
    const { productId } = await seedCatalogProduct(agent);
    const res = await order(owner, branchId, productId, 'takeaway');
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('ORDER_TYPE_NOT_SUPPORTED');
  });

  it('rejects dine-in orders and new tables when the branch turned dine-in off', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const patched = await owner.patch(`/v1/branches/${branchId}`).send({ supportsDineIn: false });
    expect(patched.status).toBe(200);
    const { productId } = await seedCatalogProduct(agent);

    const res = await order(owner, branchId, productId, 'dine_in', newUuidV7());
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('ORDER_TYPE_NOT_SUPPORTED');

    const table = await owner.post(`/v1/branches/${branchId}/tables`).send({ label: 'T1' });
    expect(table.status).toBe(422);
    expect(JSON.stringify(table.body)).toContain('ORDER_TYPE_NOT_SUPPORTED');

    // Reading tables still works, and takeaway orders are unaffected.
    const list = await owner.get(`/v1/branches/${branchId}/tables`);
    expect(list.status).toBe(200);
    const takeaway = await order(owner, branchId, productId, 'takeaway');
    expect(takeaway.status).toBe(201);
  });

  it('blocks turning a type off while it has open orders', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { productId } = await seedCatalogProduct(agent);
    const placed = await order(owner, branchId, productId, 'takeaway');
    expect(placed.status).toBe(201);

    const res = await owner.patch(`/v1/branches/${branchId}`).send({ supportsTakeaway: false });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('ORDER_TYPE_HAS_OPEN_ORDERS');

    // Dine-in has no open orders, so it can still be turned off.
    const ok = await owner.patch(`/v1/branches/${branchId}`).send({ supportsDineIn: false });
    expect(ok.status).toBe(200);
  });

  async function advance(owner: Agent, branchId: string, orderId: string, steps: string[]) {
    for (const to of steps) {
      const cur = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
      const res = await owner
        .post(`/v1/branches/${branchId}/orders/${orderId}/status`)
        .send({ to, expectedVersion: (cur.body as { version: number }).version });
      expect(res.status).toBeLessThan(300);
    }
  }

  async function payBill(owner: Agent, branchId: string, billId: string) {
    const bill = (await owner.get(`/v1/branches/${branchId}/bills/${billId}`)).body as {
      orders: { items: { id: string }[] }[];
    };
    const clientPaymentId = newUuidV7();
    const paid = await owner
      .post(`/v1/branches/${branchId}/bills/${billId}/payments`)
      .set('Idempotency-Key', clientPaymentId)
      .send({
        method: 'card',
        clientPaymentId,
        itemIds: bill.orders.flatMap((o) => o.items.map((i) => i.id)),
      });
    expect(paid.status).toBe(201);
  }

  async function tableFor(owner: Agent, branchId: string) {
    const orgId = ((await owner.get('/v1/me')).body as { org: { id: string } }).org.id;
    return insertDiningTable(db, orgId, branchId, `T-${newUuidV7().slice(-6)}`);
  }

  it('blocks turning dine-in off while a finished order still sits on an open bill', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { productId } = await seedCatalogProduct(agent);
    const table = await tableFor(owner, branchId);

    const placed = await order(owner, branchId, productId, 'dine_in', table);
    expect(placed.status).toBe(201);
    const { id, billId } = placed.body as { id: string; billId: string };
    await payBill(owner, branchId, billId);
    await advance(owner, branchId, id, ['preparing', 'ready', 'completed']);

    const res = await owner.patch(`/v1/branches/${branchId}`).send({ supportsDineIn: false });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('ORDER_TYPE_HAS_OPEN_BILLS');
  });

  it('blocks turning a type off while an order awaits payment (pay before send)', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const placed = await order(owner, branchId, productId, 'takeaway');
    expect(placed.status).toBe(201);
    expect((placed.body as { status: string }).status).toBe('draft');

    const res = await owner.patch(`/v1/branches/${branchId}`).send({ supportsTakeaway: false });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('ORDER_TYPE_HAS_OPEN_ORDERS');
  });

  it('does not block when orders are finished and the bill is closed', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { productId } = await seedCatalogProduct(agent);
    const table = await tableFor(owner, branchId);

    const takeaway = await order(owner, branchId, productId, 'takeaway');
    const { id: takeawayId, version } = takeaway.body as { id: string; version: number };
    const cancelled = await owner
      .post(`/v1/branches/${branchId}/orders/${takeawayId}/status`)
      .send({ to: 'cancelled', expectedVersion: version, reason: 'Test cancel' });
    expect(cancelled.status).toBeLessThan(300);

    const dineIn = await order(owner, branchId, productId, 'dine_in', table);
    const { id, billId } = dineIn.body as { id: string; billId: string };
    await payBill(owner, branchId, billId);
    await advance(owner, branchId, id, ['preparing', 'ready', 'completed']);
    const closed = await owner.post(`/v1/branches/${branchId}/bills/${billId}/close`);
    expect(closed.status).toBe(200);

    const off = await owner.patch(`/v1/branches/${branchId}`).send({ supportsTakeaway: false });
    expect(off.status).toBe(200);
    const on = await owner.patch(`/v1/branches/${branchId}`).send({ supportsTakeaway: true });
    expect(on.status).toBe(200);
    const noDineIn = await owner.patch(`/v1/branches/${branchId}`).send({ supportsDineIn: false });
    expect(noDineIn.status).toBe(200);
  });

  it('never lets a toggle-off and a new order of that type both succeed', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { productId } = await seedCatalogProduct(agent);
    for (let i = 0; i < 8; i += 1) {
      const { branchId } = await createIsolatedBranch(owner);
      const [toggle, placed] = await Promise.all([
        owner.patch(`/v1/branches/${branchId}`).send({ supportsTakeaway: false }),
        order(owner, branchId, productId, 'takeaway'),
      ]);
      const toggleOk = toggle.status === 200;
      const orderOk = placed.status === 201;
      expect(toggleOk && orderOk).toBe(false);
      expect(toggleOk || orderOk).toBe(true);
      if (toggleOk) {
        expect(JSON.stringify(placed.body)).toContain('ORDER_TYPE_NOT_SUPPORTED');
      } else {
        expect(JSON.stringify(toggle.body)).toContain('ORDER_TYPE_HAS_OPEN_ORDERS');
      }
    }
  });
});
