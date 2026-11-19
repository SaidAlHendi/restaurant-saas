import { sql } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';

import { asDemoKitchen, asDemoManager, asDemoOwner } from './catalog-helpers';
import { type Clock } from '../src/core/clock/clock.tokens';

import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { createIsolatedBranch, postOrder, postPayment, seedCatalogProduct } from './ordering-helpers';

type OrderBody = {
  id: string;
  version: number;
  status: string;
  totalMinor: number;
  items: Array<{ id: string }>;
};

/** Real time plus an offset the test can push forward (no real waiting). */
class ShiftableClock implements Clock {
  private offsetMs = 0;
  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }
  reset(): void {
    this.offsetMs = 0;
  }
  advance(ms: number): void {
    this.offsetMs += ms;
  }
}

describe('Order handover (e2e)', () => {
  const clock = new ShiftableClock();
  let app: INestApplication;
  let productId = '';
  let orgId = '';
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp(undefined, clock));
    db = app.get(DRIZZLE);
    const me = await (await asDemoOwner(apiAgent(app))).get('/v1/me');
    orgId = (me.body as { org: { id: string } }).org.id;
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
  });

  beforeEach(() => {
    clock.reset();
  });

  afterAll(async () => {
    await app.close();
  });

  const totals = new Map<string, number>();

  async function create(
    owner: Agent,
    branchId: string,
    type: 'takeaway' | 'dine_in' = 'takeaway',
  ): Promise<OrderBody> {
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

  async function get(owner: Agent, branchId: string, id: string): Promise<OrderBody> {
    return (await owner.get(`/v1/branches/${branchId}/orders/${id}`)).body as OrderBody;
  }

  async function move(
    owner: Agent,
    branchId: string,
    id: string,
    to: string,
    extra: Record<string, unknown> = {},
  ) {
    const order = await get(owner, branchId, id);
    return owner
      .post(`/v1/branches/${branchId}/orders/${id}/status`)
      .send({ to, expectedVersion: order.version, ...extra });
  }

  async function pay(owner: Agent, branchId: string, id: string) {
    const order = await get(owner, branchId, id);
    const clientPaymentId = newUuidV7();
    const res = await postPayment(owner, branchId, id, {
      clientPaymentId,
      expectedVersion: order.version,
      method: 'card',
      amountMinor: totals.get(id) ?? 0,
    }, clientPaymentId);
    if (![200, 201].includes(res.status)) throw new Error(JSON.stringify(res.body));
    return res;
  }

  async function toReady(owner: Agent, branchId: string, id: string) {
    const a = await move(owner, branchId, id, 'preparing');
    expect([a.status, JSON.stringify(a.body)]).toEqual([201, expect.anything()]);
    const b = await move(owner, branchId, id, 'ready');
    expect([b.status, JSON.stringify(b.body)]).toEqual([201, expect.anything()]);
  }

  it('ready and paid does NOT complete; Picked up completes it', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await create(owner, branchId);
    await pay(owner, branchId, order.id);
    await toReady(owner, branchId, order.id);
    expect((await get(owner, branchId, order.id)).status).toBe('ready');

    const done = await move(owner, branchId, order.id, 'completed');
    expect(done.status).toBe(201);
    expect((done.body as OrderBody).status).toBe('completed');
    const events = await owner.get(`/v1/branches/${branchId}/orders/${order.id}/events`);
    const last = (events.body as { items: Array<{ payload: Record<string, unknown> }> }).items.at(-1);
    expect(last?.payload.handover).toBe(true);
  });

  it('Picked up on an unpaid ready order is 422 ORDER_NOT_PAID; paying later then works', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await create(owner, branchId);
    await toReady(owner, branchId, order.id);

    const denied = await move(owner, branchId, order.id, 'completed');
    expect(denied.status).toBe(422);
    expect((denied.body as { error: { code: string } }).error.code).toBe('ORDER_NOT_PAID');

    await pay(owner, branchId, order.id);
    expect((await get(owner, branchId, order.id)).status).toBe('ready');
    expect((await move(owner, branchId, order.id, 'completed')).status).toBe(201);
  });

  it('first item tick moves placed to preparing; manual transition still works', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const kitchen = await asDemoKitchen(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await create(owner, branchId);
    const tick = await kitchen
      .post(`/v1/branches/${branchId}/orders/${order.id}/items/${order.items[0]?.id ?? ''}/status`)
      .send({ to: 'ready', expectedVersion: order.version });
    expect(tick.status).toBe(201);
    expect((tick.body as OrderBody).status).toBe('preparing');

    const manual = await create(owner, branchId);
    expect((await move(owner, branchId, manual.id, 'preparing')).status).toBe(201);
  });

  it('undo ready within the window works; after the window it is refused', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await create(owner, branchId);
    await toReady(owner, branchId, order.id);

    // Without undo the reverse move stays invalid.
    const plain = await move(owner, branchId, order.id, 'preparing');
    expect(plain.status).toBe(422);

    const undone = await move(owner, branchId, order.id, 'preparing', { undo: true });
    expect(undone.status).toBe(201);
    expect((undone.body as OrderBody).status).toBe('preparing');

    expect((await move(owner, branchId, order.id, 'ready')).status).toBe(201);
    clock.advance(16_000);
    const late = await move(owner, branchId, order.id, 'preparing', { undo: true });
    expect([409, 422]).toContain(late.status);
    expect((await get(owner, branchId, order.id)).status).toBe('ready');
  });

  it('undo handover returns completed to ready, logs undo, and handles stale version', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await create(owner, branchId);
    await pay(owner, branchId, order.id);
    await toReady(owner, branchId, order.id);
    const done = await move(owner, branchId, order.id, 'completed');
    const doneVersion = (done.body as OrderBody).version;

    const stale = await owner
      .post(`/v1/branches/${branchId}/orders/${order.id}/status`)
      .send({ to: 'ready', expectedVersion: doneVersion - 1, undo: true });
    expect([stale.status, JSON.stringify(stale.body)]).toEqual([409, expect.anything()]);

    const undone = await move(owner, branchId, order.id, 'ready', { undo: true });
    expect(undone.status).toBe(201);
    expect((undone.body as OrderBody).status).toBe('ready');
    const events = await owner.get(`/v1/branches/${branchId}/orders/${order.id}/events`);
    const last = (events.body as { items: Array<{ payload: Record<string, unknown> }> }).items.at(-1);
    expect(last?.payload.undo).toBe(true);
  });

  it.each([
    ['takeaway', true],
    ['takeaway', false],
    ['dine_in', true],
    ['dine_in', false],
  ] as const)('%s with payBeforeSend=%s reaches handover', async (type, payBeforeSend) => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend });
    const order = await create(owner, branchId, type);
    expect(order.status).toBe(payBeforeSend ? 'draft' : 'placed');
    await pay(owner, branchId, order.id);
    expect((await get(owner, branchId, order.id)).status).toBe('placed');
    await toReady(owner, branchId, order.id);
    expect((await get(owner, branchId, order.id)).status).toBe('ready');
    expect((await move(owner, branchId, order.id, 'completed')).status).toBe(201);
  });

  it('undo by a different user is refused for ready -> preparing and completed -> ready', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const manager = await asDemoManager(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await create(owner, branchId);
    await pay(owner, branchId, order.id);
    await toReady(owner, branchId, order.id);

    const otherReady = await move(manager, branchId, order.id, 'preparing', { undo: true });
    expect(otherReady.status).toBe(422);
    expect((otherReady.body as { error: { code: string } }).error.code).toBe('ORDER_UNDO_EXPIRED');

    expect((await move(owner, branchId, order.id, 'completed')).status).toBe(201);
    const otherDone = await move(manager, branchId, order.id, 'ready', { undo: true });
    expect(otherDone.status).toBe(422);
    expect((otherDone.body as { error: { code: string } }).error.code).toBe('ORDER_UNDO_EXPIRED');
    expect((await get(owner, branchId, order.id)).status).toBe('completed');
  });

  it('undo of a handover is refused once the dine-in table bill is closed', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const order = await create(owner, branchId, 'dine_in');
    await pay(owner, branchId, order.id);
    await toReady(owner, branchId, order.id);
    expect((await move(owner, branchId, order.id, 'completed')).status).toBe(201);

    const billId = ((await owner.get(`/v1/branches/${branchId}/orders/${order.id}`)).body as {
      billId: string;
    }).billId;
    expect((await owner.post(`/v1/branches/${branchId}/bills/${billId}/close`)).status).toBe(200);

    const undone = await move(owner, branchId, order.id, 'ready', { undo: true });
    expect(undone.status).toBe(422);
    expect((undone.body as { error: { code: string } }).error.code).toBe(
      'ORDER_UNDO_BILL_CLOSED',
    );
    expect((await get(owner, branchId, order.id)).status).toBe('completed');
  });

  it('Ready in one tap on a New order; Undo returns to preparing and restores item progress', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const kitchen = await asDemoKitchen(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const clientOrderId = newUuidV7();
    const res = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        items: [
          { productId, quantity: 1, modifierIds: [] },
          { productId, quantity: 2, modifierIds: [] },
        ],
      },
      clientOrderId,
    );
    const order = res.body as OrderBody;
    type Detail = {
      id: string;
      version: number;
      status: string;
      items: Array<{ id: string; status: string }>;
    };

    // placed -> ready directly (no Start, no item ticks)
    const ready = await move(kitchen, branchId, order.id, 'ready');
    expect(ready.status).toBe(201);
    const readyBody = ready.body as Detail;
    expect(readyBody.status).toBe('ready');
    expect(readyBody.items.map((i) => i.status)).toEqual(['ready', 'ready']);

    const events = await owner.get(`/v1/branches/${branchId}/orders/${order.id}/events`);
    const last = (events.body as { items: Array<{ payload: Record<string, unknown> }> }).items.at(-1);
    expect(last?.payload.auto).toBe(false);

    // Undo: back to preparing (not placed), items cooking again
    const undone = await move(kitchen, branchId, order.id, 'preparing', { undo: true });
    expect(undone.status).toBe(201);
    expect((undone.body as Detail).status).toBe('preparing');
    expect((undone.body as Detail).items.map((i) => i.status)).toEqual(['preparing', 'preparing']);

    // Second order: one item ticked first, then whole-order Ready, then Undo keeps the tick.
    const clientOrderId2 = newUuidV7();
    const two = await postOrder(
      owner,
      branchId,
      {
        clientOrderId: clientOrderId2,
        type: 'takeaway',
        items: [
          { productId, quantity: 1, modifierIds: [] },
          { productId, quantity: 1, modifierIds: [] },
        ],
      },
      clientOrderId2,
    );
    const twoOrder = two.body as Detail;
    const itemUrl = `/v1/branches/${branchId}/orders/${twoOrder.id}/items/${twoOrder.items[0]?.id ?? ''}/status`;
    const tick = await kitchen.post(itemUrl).send({ to: 'ready', expectedVersion: twoOrder.version });
    expect((tick.body as Detail).status).toBe('preparing');
    expect((await move(kitchen, branchId, twoOrder.id, 'ready')).status).toBe(201);
    const back = await move(kitchen, branchId, twoOrder.id, 'preparing', { undo: true });
    expect((back.body as Detail).items.map((i) => i.status)).toEqual(['ready', 'preparing']);
  });

  it('todayOnly hides ready orders from earlier days and reports how many (hiddenOlderCount)', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false });
    const old = await create(owner, branchId);
    await toReady(owner, branchId, old.id);
    await withOrg(db, orgId, async (tx) => {
      await tx.execute(
        sql`UPDATE orders SET business_date = business_date - 1 WHERE id = ${old.id}::uuid`,
      );
    });
    const today = await create(owner, branchId);
    await toReady(owner, branchId, today.id);

    const list = async (query: Record<string, unknown>) =>
      (await owner.get(`/v1/branches/${branchId}/orders`).query(query)).body as {
        items: Array<{ id: string }>;
        hiddenOlderCount?: number;
      };
    const filtered = await list({ status: 'ready', todayOnly: true });
    expect(filtered.items.map((o) => o.id)).toEqual([today.id]);
    expect(filtered.hiddenOlderCount).toBe(1);

    const all = await list({ status: 'ready' });
    expect(all.items.map((o) => o.id).sort()).toEqual([old.id, today.id].sort());
    expect(all.hiddenOlderCount).toBeUndefined();

    const active = await list({ activeOnly: true, todayOnly: true });
    expect(active.hiddenOlderCount).toBe(1);
    // Lists of finished orders never report hidden open orders.
    expect((await list({ status: 'completed', todayOnly: true })).hiddenOlderCount).toBeUndefined();
  });

  it('a draft (awaiting payment) order from an earlier day is hidden by todayOnly and counted', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const old = await create(owner, branchId);
    expect(old.status).toBe('draft');
    await withOrg(db, orgId, async (tx) => {
      await tx.execute(
        sql`UPDATE orders SET business_date = business_date - 1 WHERE id = ${old.id}::uuid`,
      );
    });
    const res = await owner
      .get(`/v1/branches/${branchId}/orders`)
      .query({ status: 'draft', todayOnly: true });
    const body = res.body as { items: Array<{ id: string }>; hiddenOlderCount?: number };
    expect(body.items).toEqual([]);
    expect(body.hiddenOlderCount).toBe(1);

    const all = await owner.get(`/v1/branches/${branchId}/orders`).query({ status: 'draft' });
    expect((all.body as { items: Array<{ id: string }> }).items.map((o) => o.id)).toEqual([old.id]);
  });
});
