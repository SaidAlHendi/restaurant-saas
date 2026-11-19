import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { orderEvents } from '../src/core/db/schema';
import { withOrg } from '../src/core/db/with-org';
import { eq } from 'drizzle-orm';
import { newUuidV7 } from '../src/lib/uuid';

import { asDemoCashier, asDemoKitchen, asDemoManager, asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent, withBranch } from './http';
import { createIsolatedBranch, postOrder, postPayment, seedCatalogProduct } from './ordering-helpers';

type OrderBody = {
  id: string;
  version: number;
  status: string;
  totalMinor: number;
  items: Array<{ id: string }>;
};

describe('Reopen a completed order (e2e)', () => {
  let app: INestApplication;
  let productId = '';
  let orgId = '';
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    db = app.get(DRIZZLE);
    const me = await (await asDemoOwner(apiAgent(app))).get('/v1/me');
    orgId = (me.body as { org: { id: string } }).org.id;
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
  });

  afterAll(async () => {
    await app.close();
  });

  const totals = new Map<string, number>();

  async function create(owner: Agent, branchId: string, type: 'takeaway' | 'dine_in' = 'takeaway') {
    let tableId: string | undefined;
    if (type === 'dine_in') {
      const table = await owner
        .post(`/v1/branches/${branchId}/tables`)
        .send({ label: `T-${newUuidV7().slice(-6)}` });
      tableId = (table.body as { id: string }).id;
    }
    const clientOrderId = newUuidV7();
    const res = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type,
        ...(tableId ? { tableId } : {}),
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(res.status).toBe(201);
    const body = res.body as OrderBody;
    totals.set(body.id, body.totalMinor);
    return body;
  }

  async function get(a: Agent, branchId: string, id: string) {
    return (await a.get(`/v1/branches/${branchId}/orders/${id}`)).body as OrderBody & {
      paymentStatus: string;
      completedAt: string | null;
      billId: string | null;
    };
  }

  async function move(
    a: Agent,
    branchId: string,
    id: string,
    to: string,
    extra: Record<string, unknown> = {},
    version?: number,
  ) {
    const order = await get(a, branchId, id);
    return a
      .post(`/v1/branches/${branchId}/orders/${id}/status`)
      .send({ to, expectedVersion: version ?? order.version, ...extra });
  }

  /** A paid order moved all the way to completed. */
  async function completedOrder(owner: Agent, branchId: string, type: 'takeaway' | 'dine_in' = 'takeaway') {
    const order = await create(owner, branchId, type);
    const order0 = await get(owner, branchId, order.id);
    const clientPaymentId = newUuidV7();
    const paid = await postPayment(
      owner,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order0.version,
        method: 'card',
        amountMinor: totals.get(order.id) ?? 0,
      },
      clientPaymentId,
    );
    expect([200, 201]).toContain(paid.status);
    expect((await move(owner, branchId, order.id, 'preparing')).status).toBe(201);
    expect((await move(owner, branchId, order.id, 'ready')).status).toBe(201);
    expect((await move(owner, branchId, order.id, 'completed')).status).toBe(201);
    return order;
  }

  it('owner and manager reopen a completed order; payment stays, completedAt clears, event is written', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const manager = await asDemoManager(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });

    for (const [actor, reason] of [
      [owner, 'Customer came back'],
      [manager, undefined],
    ] as const) {
      const order = await completedOrder(owner, branchId);
      const before = await get(owner, branchId, order.id);
      expect(before.completedAt).not.toBeNull();

      const res = await move(actor, branchId, order.id, 'ready', {
        reopen: true,
        ...(reason ? { reason } : {}),
      });
      expect([res.status, JSON.stringify(res.body)]).toEqual([201, expect.anything()]);
      const after = res.body as typeof before;
      expect(after.status).toBe('ready');
      expect(after.completedAt).toBeNull();
      expect(after.paymentStatus).toBe('paid');
      expect(after.version).toBeGreaterThan(before.version);

      const events = await withOrg(db, orgId, (tx) =>
        tx.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)),
      );
      const last = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).pop();
      expect(last?.fromStatus).toBe('completed');
      expect(last?.toStatus).toBe('ready');
      expect(last?.payload).toEqual({ reopen: true, ...(reason ? { reason } : {}) });
      expect(last?.actorMembershipId).toBeTruthy();

      // The reopened order can be handed over again.
      const again = await move(owner, branchId, order.id, 'completed');
      expect(again.status).toBe(201);
      expect((again.body as { status: string }).status).toBe('completed');
    }
  });

  it('cashier and kitchen get 403 without the permission', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await completedOrder(owner, branchId);
    const cashier = withBranch(await asDemoCashier(apiAgent(app)), branchId);
    const kitchen = withBranch(await asDemoKitchen(apiAgent(app)), branchId);
    for (const actor of [cashier, kitchen]) {
      const res = await move(actor, branchId, order.id, 'ready', { reopen: true });
      expect(res.status).toBe(403);
    }
    expect((await get(owner, branchId, order.id)).status).toBe('completed');
  });

  it('a cashier with a per-employee grant can reopen; revoking it blocks again', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await completedOrder(owner, branchId);
    const staff = await owner.get('/v1/staff').expect(200);
    // The demo org has several cashiers: override all of them so the logged-in one is covered.
    const cashierIds = (staff.body as { items: Array<{ id: string; roleKey: string }> }).items
      .filter((i) => i.roleKey === 'cashier')
      .map((i) => i.id);
    expect(cashierIds.length).toBeGreaterThan(0);
    const cashier = withBranch(await asDemoCashier(apiAgent(app)), branchId);
    const setOverride = async (grant: string[]) => {
      for (const id of cashierIds) {
        await owner.put(`/v1/staff/${id}/permissions`).send({ grant, deny: [] }).expect(200);
      }
    };
    try {
      await setOverride(['orders.reopen']);
      const res = await move(cashier, branchId, order.id, 'ready', { reopen: true });
      expect(res.status).toBe(201);
    } finally {
      await setOverride([]);
    }
    await move(owner, branchId, order.id, 'completed');
    expect((await move(cashier, branchId, order.id, 'ready', { reopen: true })).status).toBe(403);
  });

  it('is in the catalog and the default roles: owner and manager yes, cashier and kitchen no', async () => {
    for (const [as, expected] of [
      [asDemoOwner, true],
      [asDemoManager, true],
      [asDemoCashier, false],
      [asDemoKitchen, false],
    ] as const) {
      const me = await (await as(apiAgent(app))).get('/v1/me');
      expect((me.body as { permissions: string[] }).permissions.includes('orders.reopen')).toBe(
        expected,
      );
    }
  });

  it('refuses orders that are not completed (and undo + reopen together)', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await create(owner, branchId);
    await move(owner, branchId, order.id, 'preparing');
    const res = await move(owner, branchId, order.id, 'ready', { reopen: true });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('ORDER_INVALID_TRANSITION');
    const both = await move(owner, branchId, order.id, 'ready', { reopen: true, undo: true });
    expect(both.status).toBe(400);
    const done = await completedOrder(owner, branchId);
    const wrongTarget = await move(owner, branchId, done.id, 'preparing', { reopen: true });
    expect(wrongTarget.status).toBe(422);
  });

  it('refuses when the table bill is already closed', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await completedOrder(owner, branchId, 'dine_in');
    const billId = (await get(owner, branchId, order.id)).billId ?? '';
    expect((await owner.post(`/v1/branches/${branchId}/bills/${billId}/close`)).status).toBe(200);
    const res = await move(owner, branchId, order.id, 'ready', { reopen: true });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('ORDER_REOPEN_BILL_CLOSED');
    expect((await get(owner, branchId, order.id)).status).toBe('completed');
  });

  it('a reopened dine-in order blocks closing its bill until handed over again', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await completedOrder(owner, branchId, 'dine_in');
    const billId = (await get(owner, branchId, order.id)).billId ?? '';
    expect((await move(owner, branchId, order.id, 'ready', { reopen: true })).status).toBe(201);
    const blocked = await owner.post(`/v1/branches/${branchId}/bills/${billId}/close`);
    expect(blocked.status).toBe(422);
    await move(owner, branchId, order.id, 'completed');
    expect((await owner.post(`/v1/branches/${branchId}/bills/${billId}/close`)).status).toBe(200);
  });

  it('a stale version is a 409 and a reason over 200 characters is rejected', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await completedOrder(owner, branchId);
    const current = await get(owner, branchId, order.id);
    const stale = await move(owner, branchId, order.id, 'ready', { reopen: true }, current.version - 1);
    expect(stale.status).toBe(409);
    const long = await move(owner, branchId, order.id, 'ready', {
      reopen: true,
      reason: 'x'.repeat(201),
    });
    expect(long.status).toBe(400);
    expect((await get(owner, branchId, order.id)).status).toBe('completed');
  });
});
