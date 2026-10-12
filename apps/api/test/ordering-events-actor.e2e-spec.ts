import { type INestApplication } from '@nestjs/common';

import { createTestApp } from './create-test-app';
import { asDemoOwner } from './catalog-helpers';
import { apiAgent } from './http';
import { postOrder, seedCatalogProduct } from './ordering-helpers';
import { newUuidV7 } from '../src/lib/uuid';

describe('Ordering events actorName (e2e)', () => {
  let app: INestApplication;
  let branchId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    const owner = await asDemoOwner(apiAgent(app));
    const me = await owner.get('/v1/me');
    branchId =
      (me.body as { branches: Array<{ id: string; isActive: boolean }> }).branches.find(
        (b) => b.isActive,
      )?.id ?? '';
    if (!branchId) {
      throw new Error('missing active demo branch');
    }
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns actorName and never exposes email in events payload', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const clientOrderId = newUuidV7();
    const placed = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(placed.status).toBe(201);
    const orderId = (placed.body as { id: string }).id;

    const events = await owner.get(`/v1/branches/${branchId}/orders/${orderId}/events`);
    expect(events.status).toBe(200);
    const items = (events.body as { items: Array<{ actorName: string | null; payload: unknown }> }).items;
    expect(items.length).toBeGreaterThan(0);
    const withName = items.find((e) => e.actorName !== null);
    expect(withName?.actorName).toContain('owner');
    const serialized = JSON.stringify(events.body);
    expect(serialized.includes('@demo.local')).toBe(false);
    expect(serialized.includes('email')).toBe(false);
  });
});
