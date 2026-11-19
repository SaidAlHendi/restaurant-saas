import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { newUuidV7 } from '../src/lib/uuid';

import { asDemoKitchen, asDemoOwner } from './catalog-helpers';
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

describe('Order handover (e2e)', () => {
  let app: INestApplication;
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
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
    jest.setTimeout(30_000);
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
    await new Promise((resolve) => setTimeout(resolve, 15_500));
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
});
