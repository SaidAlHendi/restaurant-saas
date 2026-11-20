import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { createIsolatedBranch, postOrder, seedCatalogProduct } from './ordering-helpers';

type BranchRow = { id: string; supportsDineIn: boolean; supportsTakeaway: boolean };

describe('Branch order types (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
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
    expect(res.status).toBeGreaterThanOrEqual(400);

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
});
