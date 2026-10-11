import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { asDemoOwner, asOtherOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { seedCatalogProduct, seedProductWithRequiredModifier } from './ordering-helpers';

describe('POS menu (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let branchId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    const owner = await asDemoOwner(apiAgent(app));
    const me = await owner.get('/v1/me');
    branchId =
      (me.body as { branches: Array<{ id: string; isActive: boolean }> }).branches.find(
        (b) => b.isActive,
      )?.id ?? '';
    if (!branchId) {
      throw new Error('no branch');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns active catalog with modifier groups', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { productId } = await seedProductWithRequiredModifier(agent);
    const res = await owner.get(`/v1/branches/${branchId}/pos/menu`);
    expect(res.status).toBe(200);
    const body = res.body as {
      branch: { id: string; currency: string };
      categories: Array<{
        products: Array<{
          id: string;
          name: Record<string, string>;
          modifierGroups: Array<{ modifiers: unknown[] }>;
        }>;
      }>;
    };
    expect(body.branch.id).toBe(branchId);
    const product = body.categories
      .flatMap((c) => c.products)
      .find((p) => p.id === productId);
    expect(product).toBeDefined();
    expect(product?.name.en).toBeDefined();
    expect((product?.modifierGroups.length ?? 0) > 0).toBe(true);
  });

  it('hides inactive and soft-deleted products', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { productId } = await seedCatalogProduct(agent);
    const inactive = await owner.patch(`/v1/products/${productId}`).send({ isActive: false });
    expect(inactive.status).toBe(200);
    const res = await owner.get(`/v1/branches/${branchId}/pos/menu`);
    expect(res.status).toBe(200);
    const ids = (res.body as { categories: Array<{ products: Array<{ id: string }> }> }).categories
      .flatMap((c) => c.products.map((p) => p.id));
    expect(ids.includes(productId)).toBe(false);
  });

  it('404 for other tenant branch', async () => {
    const other = await asOtherOwner(apiAgent(app));
    const res = await other.get(`/v1/branches/${branchId}/pos/menu`);
    expect(res.status).toBe(404);
  });
});
