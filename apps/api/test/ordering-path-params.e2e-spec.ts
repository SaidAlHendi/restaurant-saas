import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { createTestApp } from './create-test-app';
import { asDemoOwner } from './catalog-helpers';
import { apiAgent } from './http';
import { newUuidV7 } from '../src/lib/uuid';
import { seedCatalogProduct } from './ordering-helpers';

describe('Ordering path params (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let branchId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    const owner = await asDemoOwner(agent);
    const me = await owner.get('/v1/me');
    branchId =
      (me.body as { branches: Array<{ id: string; isActive: boolean }> }).branches.find(
        (b) => b.isActive,
      )?.id ?? '';
    ({ productId } = await seedCatalogProduct(agent));
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 404 for non-UUID orderId on order routes', async () => {
    const owner = await asDemoOwner(agent);
    const res = await owner.get(`/v1/branches/${branchId}/orders/not-a-uuid`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-UUID itemId on void route', async () => {
    const owner = await asDemoOwner(agent);
    const clientOrderId = newUuidV7();
    const created = await owner
      .post(`/v1/branches/${branchId}/orders`)
      .set('Idempotency-Key', clientOrderId)
      .send({
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      });
    expect(created.status).toBe(201);
    const orderId = (created.body as { id: string }).id;
    const voidRes = await owner
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/not-a-uuid/void`)
      .send({ expectedVersion: 1, reason: 'test' });
    expect(voidRes.status).toBe(404);
  });

  it('returns 404 for non-UUID tableId on table routes', async () => {
    const owner = await asDemoOwner(agent);
    const res = await owner.patch(`/v1/branches/${branchId}/tables/not-a-uuid`).send({ label: 'X' });
    expect(res.status).toBe(404);
  });
});
