import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { apiAgent } from './http';
import { createTestApp } from './create-test-app';
import { asDemoKitchen, asDemoOwner, asOtherOwner, categoryBody, productBody } from './catalog-helpers';

describe('Catalog products (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createCategory(owner: Agent) {
    const res = await owner.post('/v1/categories').send(categoryBody());
    return (res.body as { id: string }).id;
  }

  it('happy path list, get, patch, soft delete', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    const created = await owner.post('/v1/products').send(productBody(categoryId));
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;

    const list = await owner.get('/v1/products').query({ categoryId, limit: 10 });
    expect(list.status).toBe(200);
    expect((list.body as { items: { id: string }[] }).items.some((p) => p.id === productId)).toBe(
      true,
    );

    const detail = await owner.get(`/v1/products/${productId}`);
    expect(detail.status).toBe(200);

    const patched = await owner.patch(`/v1/products/${productId}`).send({ priceMinor: 2000 });
    expect(patched.status).toBe(200);
    expect((patched.body as { priceMinor: number }).priceMinor).toBe(2000);

    const removed = await owner.delete(`/v1/products/${productId}`);
    expect(removed.status).toBe(200);
  });

  it('403 kitchen cannot create', async () => {
    const kitchen = await asDemoKitchen(agent);
    const res = await kitchen.post('/v1/products').send({
      categoryId: '00000000-0000-4000-8000-000000000399',
      name: { en: 'X', ar: 'X' },
      priceMinor: 1,
    });
    expect(res.status).toBe(403);
  });

  it('404 for other org product id', async () => {
    const other = await asOtherOwner(agent);
    const categoryId = await createCategory(other);
    const created = await other.post('/v1/products').send(productBody(categoryId));
    const productId = (created.body as { id: string }).id;

    const demo = await asDemoOwner(agent);
    const get = await demo.get(`/v1/products/${productId}`);
    expect(get.status).toBe(404);
  });

  it('404 when category is deleted', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    await owner.delete(`/v1/categories/${categoryId}`);
    const res = await owner.post('/v1/products').send(productBody(categoryId));
    expect(res.status).toBe(404);
  });

  it('400 duplicate modifier group ids', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    const product = await owner.post('/v1/products').send(productBody(categoryId));
    const productId = (product.body as { id: string }).id;
    const group = await owner.post('/v1/modifier-groups').send({
      name: { en: 'Size', ar: 'حجم' },
      minSelect: 0,
      maxSelect: 1,
    });
    const groupId = (group.body as { id: string }).id;
    const res = await owner.put(`/v1/products/${productId}/modifier-groups`).send({
      groupIds: [groupId, groupId],
    });
    expect(res.status).toBe(400);
  });

  it('400 reorder incomplete list', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    const p1 = await owner.post('/v1/products').send(productBody(categoryId, 100));
    const p2 = await owner.post('/v1/products').send(productBody(categoryId, 200));
    const id1 = (p1.body as { id: string }).id;
    const res = await owner.put('/v1/products/reorder').send({
      categoryId,
      orderedIds: [id1],
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('REORDER_INCOMPLETE_LIST');
    expect((p2.body as { id: string }).id).toBeDefined();
  });
});
