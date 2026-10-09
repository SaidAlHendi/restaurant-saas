import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { SEED_ORG } from './factories';
import { apiAgent } from './http';
import { createTestApp } from './create-test-app';
import { asDemoKitchen, asDemoOwner, asOtherOwner, categoryBody } from './catalog-helpers';

describe('Catalog categories (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('happy path CRUD and reorder', async () => {
    const owner = await asDemoOwner(agent);
    const created = await owner.post('/v1/categories').send(categoryBody('Drinks', 'مشروبات'));
    expect(created.status).toBe(201);
    const categoryId = (created.body as { id: string }).id;

    const list = await owner.get('/v1/categories');
    expect(list.status).toBe(200);
    expect((list.body as { items: { id: string }[] }).items.some((c) => c.id === categoryId)).toBe(
      true,
    );

    const patched = await owner.patch(`/v1/categories/${categoryId}`).send({
      name: { en: 'Hot Drinks', ar: 'مشروبات ساخنة' },
    });
    expect(patched.status).toBe(200);
    expect((patched.body as { name: { en: string } }).name.en).toBe('Hot Drinks');

    // Reorder needs every active category; the default page (20) is too small once a test DB fills up.
    const beforeReorder = await owner.get('/v1/categories?limit=100');
    const allIds = (beforeReorder.body as { items: { id: string }[] }).items.map((c) => c.id);
    const reordered = await owner.put('/v1/categories/reorder').send({ orderedIds: allIds });
    expect(reordered.status).toBe(200);
  });

  it('400 when default locale name missing', async () => {
    const owner = await asDemoOwner(agent);
    const res = await owner.post('/v1/categories').send({ name: { ar: 'فقط' } });
    expect(res.status).toBe(400);
  });

  it('403 for kitchen without menu.read', async () => {
    const kitchen = await asDemoKitchen(agent);
    const res = await kitchen.get('/v1/categories');
    expect(res.status).toBe(403);
  });

  it('404 when patching another org category', async () => {
    const other = await asOtherOwner(agent);
    const created = await other.post('/v1/categories').send(categoryBody('Other', 'أخرى'));
    const otherId = (created.body as { id: string }).id;

    const demo = await asDemoOwner(agent);
    const patch = await demo.patch(`/v1/categories/${otherId}`).send({ isActive: false });
    expect(patch.status).toBe(404);
  });

  it('409 when deleting category with products', async () => {
    const owner = await asDemoOwner(agent);
    const cat = await owner.post('/v1/categories').send(categoryBody('Meals', 'وجبات'));
    const categoryId = (cat.body as { id: string }).id;
    await owner.post('/v1/products').send({
      categoryId,
      name: { en: 'Plate', ar: 'طبق' },
      priceMinor: 1000,
    });
    const del = await owner.delete(`/v1/categories/${categoryId}`);
    expect(del.status).toBe(409);
    expect((del.body as { error: { code: string } }).error.code).toBe('CATEGORY_HAS_ACTIVE_PRODUCTS');
  });

  it('lists never include another org', async () => {
    const demo = await asDemoOwner(agent);
    const list = await demo.get('/v1/categories');
    const items = (list.body as { items: { orgId: string }[] }).items;
    expect(items.every((c) => c.orgId === SEED_ORG.demo.id)).toBe(true);
  });

  it('reorder foreign id returns 404', async () => {
    const other = await asOtherOwner(agent);
    const created = await other.post('/v1/categories').send(categoryBody('X', 'X'));
    const foreignId = (created.body as { id: string }).id;

    const demo = await asDemoOwner(agent);
    const mine = await demo.get('/v1/categories');
    const myId = (mine.body as { items: { id: string }[] }).items[0]?.id;
    expect(myId).toBeDefined();

    const reorder = await demo
      .put('/v1/categories/reorder')
      .send({ orderedIds: [myId ?? '', foreignId] });
    expect(reorder.status).toBe(404);

    const after = await demo.get('/v1/categories');
    const first = (after.body as { items: { id: string }[] }).items[0];
    expect(first?.id).toBe(myId);
  });
});
