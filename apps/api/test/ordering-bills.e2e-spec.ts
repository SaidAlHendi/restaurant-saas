import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { createIsolatedBranch, insertDiningTable, seedCatalogProduct } from './ordering-helpers';

interface BillBody {
  id: string;
  status: string;
  totalMinor: number;
  paidMinor: number;
  dueMinor: number;
  orders: {
    id: string;
    status: string;
    round: number;
    totalMinor: number;
    dueMinor: number;
    items: { id: string; seat: string | null; shareMinor: number; paidMinor: number }[];
  }[];
}

describe('Table bills (e2e)', () => {
  let app: INestApplication;
  let owner: Agent;
  let db: DrizzleDb;
  let orgId = '';
  let productId = '';
  let branchId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    db = app.get(DRIZZLE);
    owner = await asDemoOwner(apiAgent(app));
    orgId = ((await owner.get('/v1/me')).body as { org: { id: string } }).org.id;
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
    ({ branchId } = await createIsolatedBranch(owner));
  });

  afterAll(async () => {
    await app.close();
  });

  const order = (
    tableId: string,
    items: { quantity: number; seat?: string }[],
    extra: Record<string, unknown> = {},
  ) => {
    const clientOrderId = newUuidV7();
    return owner
      .post(`/v1/branches/${branchId}/orders`)
      .set('Idempotency-Key', clientOrderId)
      .send({
        clientOrderId,
        type: 'dine_in',
        tableId,
        items: items.map((i) => ({ productId, modifierIds: [], ...i })),
        ...extra,
      });
  };
  const bill = async (id: string) =>
    (await owner.get(`/v1/branches/${branchId}/bills/${id}`)).body as BillBody;
  const pay = (id: string, body: Record<string, unknown>) => {
    const clientPaymentId = (body['clientPaymentId'] as string | undefined) ?? newUuidV7();
    return owner
      .post(`/v1/branches/${branchId}/bills/${id}/payments`)
      .set('Idempotency-Key', clientPaymentId)
      .send({ method: 'card', ...body, clientPaymentId });
  };

  it('puts every round at a table on one bill, and gives takeaway none', async () => {
    const table = await insertDiningTable(db, orgId, branchId, `T-${newUuidV7().slice(-6)}`);
    const first = await order(table, [{ quantity: 1 }]);
    const second = await order(table, [{ quantity: 2 }]);
    expect(first.status).toBe(201);
    const billId = (first.body as { billId: string }).billId;
    expect(billId).toEqual(expect.any(String));
    expect((second.body as { billId: string }).billId).toBe(billId);

    const b = await bill(billId);
    expect(b.orders.map((o) => o.round)).toEqual([1, 2]);
    expect(b.totalMinor).toBe((b.orders[0]?.totalMinor ?? 0) + (b.orders[1]?.totalMinor ?? 0));

    const takeawayId = newUuidV7();
    const takeaway = await owner
      .post(`/v1/branches/${branchId}/orders`)
      .set('Idempotency-Key', takeawayId)
      .send({
        clientOrderId: takeawayId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      });
    expect((takeaway.body as { billId: string | null }).billId).toBeNull();
  });

  it('opens one bill when two first orders arrive together', async () => {
    const table = await insertDiningTable(db, orgId, branchId, `C-${newUuidV7().slice(-6)}`);
    const [a, b] = await Promise.all([
      order(table, [{ quantity: 1 }]),
      order(table, [{ quantity: 1 }]),
    ]);
    expect((a.body as { billId: string }).billId).toBe((b.body as { billId: string }).billId);
  });

  it('asks which bill when a table has two, and a separate bill is possible', async () => {
    const table = await insertDiningTable(db, orgId, branchId, `S-${newUuidV7().slice(-6)}`);
    const first = await order(table, [{ quantity: 1 }]);
    const firstBill = (first.body as { billId: string }).billId;
    const second = await order(table, [{ quantity: 1 }], { newBill: true, billLabel: 'Group B' });
    const secondBill = (second.body as { billId: string }).billId;
    expect(secondBill).not.toBe(firstBill);

    const ambiguous = await order(table, [{ quantity: 1 }]);
    expect(ambiguous.status).toBe(422);
    expect(JSON.stringify(ambiguous.body)).toContain('BILL_AMBIGUOUS');

    const chosen = await order(table, [{ quantity: 1 }], { billId: secondBill });
    expect((chosen.body as { billId: string }).billId).toBe(secondBill);

    const open = await owner.get(`/v1/branches/${branchId}/bills`).query({ tableId: table });
    expect((open.body as BillBody[]).map((x) => x.id).sort()).toEqual(
      [firstBill, secondBill].sort(),
    );
  });

  it('pays per guest, never twice, and closes once everything is done', async () => {
    const table = await insertDiningTable(db, orgId, branchId, `G-${newUuidV7().slice(-6)}`);
    const r1 = await order(table, [
      { quantity: 1, seat: 'Guest 1' },
      { quantity: 2, seat: 'Guest 2' },
    ]);
    const billId = (r1.body as { billId: string }).billId;
    await order(table, [{ quantity: 1, seat: 'Guest 1' }]);

    const before = await bill(billId);
    const items = before.orders.flatMap((o) => o.items);
    const guest1 = items.filter((i) => i.seat === 'Guest 1');
    expect(guest1).toHaveLength(2);
    expect(items.reduce((s, i) => s + i.shareMinor, 0)).toBe(before.totalMinor);

    const guest1Total = guest1.reduce((s, i) => s + i.shareMinor, 0);
    const paid = await pay(billId, { itemIds: guest1.map((i) => i.id) });
    expect(paid.status).toBe(201);
    const afterGuest1 = await bill(billId);
    expect(afterGuest1.paidMinor).toBe(guest1Total);
    expect(afterGuest1.dueMinor).toBe(before.totalMinor - guest1Total);

    // Paying the same items again is refused; the same payment id is a harmless replay.
    expect((await pay(billId, { itemIds: guest1.map((i) => i.id) })).status).toBe(422);
    const replayId = newUuidV7();
    const guest2 = items.filter((i) => i.seat === 'Guest 2');
    const first = await pay(billId, {
      clientPaymentId: replayId,
      itemIds: guest2.map((i) => i.id),
    });
    const replay = await pay(billId, {
      clientPaymentId: replayId,
      itemIds: guest2.map((i) => i.id),
    });
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect((await bill(billId)).dueMinor).toBe(0);

    // Cannot close while orders are still in the kitchen.
    expect((await owner.post(`/v1/branches/${branchId}/bills/${billId}/close`)).status).toBe(422);
    for (const o of afterGuest1.orders) {
      for (const status of ['preparing', 'ready', 'completed']) {
        const cur = await owner.get(`/v1/branches/${branchId}/orders/${o.id}`);
        const res = await owner
          .post(`/v1/branches/${branchId}/orders/${o.id}/status`)
          .send({ to: status, expectedVersion: (cur.body as { version: number }).version });
        expect(res.status).toBeLessThan(300);
      }
    }
    const closed = await owner.post(`/v1/branches/${branchId}/bills/${billId}/close`);
    expect(closed.status).toBe(200);
    expect((closed.body as BillBody).status).toBe('closed');
    // A closed bill takes no more orders; the next order opens a fresh one.
    const next = await order(table, [{ quantity: 1 }]);
    expect((next.body as { billId: string }).billId).not.toBe(billId);
  });

  it('pays an amount oldest first, with cash change, and rejects overpaying', async () => {
    const table = await insertDiningTable(db, orgId, branchId, `A-${newUuidV7().slice(-6)}`);
    const r1 = await order(table, [{ quantity: 1 }]);
    const billId = (r1.body as { billId: string }).billId;
    await order(table, [{ quantity: 1 }]);
    const b = await bill(billId);
    const first = b.orders[0];
    if (!first) throw new Error('missing order');

    expect((await pay(billId, { amountMinor: b.totalMinor + 1 })).status).toBe(422);
    const res = await pay(billId, {
      method: 'cash',
      amountMinor: first.totalMinor + 100,
      tenderedMinor: first.totalMinor + 1000,
    });
    expect(res.status).toBe(201);
    expect((res.body as { changeMinor: number }).changeMinor).toBe(900);
    const after = await bill(billId);
    expect(after.orders[0]?.dueMinor).toBe(0);
    expect(after.orders[1]?.dueMinor).toBe((b.orders[1]?.totalMinor ?? 0) - 100);
  });

  it('starts a fresh bill when the previous visit was paid per order and completed', async () => {
    const table = await insertDiningTable(db, orgId, branchId, `L-${newUuidV7().slice(-6)}`);
    const first = await order(table, [{ quantity: 1 }]);
    const body = first.body as { id: string; billId: string; version: number; totalMinor: number };
    const clientPaymentId = newUuidV7();
    const paid = await owner
      .post(`/v1/branches/${branchId}/orders/${body.id}/payments`)
      .set('Idempotency-Key', clientPaymentId)
      .send({
        clientPaymentId,
        expectedVersion: body.version,
        method: 'card',
        amountMinor: body.totalMinor,
      });
    expect(paid.status).toBe(201);
    for (const status of ['preparing', 'ready', 'completed']) {
      const cur = await owner.get(`/v1/branches/${branchId}/orders/${body.id}`);
      const res = await owner
        .post(`/v1/branches/${branchId}/orders/${body.id}/status`)
        .send({ to: status, expectedVersion: (cur.body as { version: number }).version });
      expect(res.status).toBeLessThan(300);
    }
    const next = await order(table, [{ quantity: 1 }]);
    expect((next.body as { billId: string }).billId).not.toBe(body.billId);
    expect((await bill(body.billId)).status).toBe('closed');
  });
});
