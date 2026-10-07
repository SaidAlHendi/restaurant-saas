import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { SEED_ORG } from './factories';
import { apiAgent } from './http';
import { createTestApp } from './create-test-app';
import {
  asDemoKitchen,
  asDemoOwner,
  asOtherOwner,
  categoryBody,
  productBody,
} from './catalog-helpers';

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

  it('403 kitchen cannot create or list', async () => {
    const kitchen = await asDemoKitchen(agent);
    const createRes = await kitchen.post('/v1/products').send({
      categoryId: '00000000-0000-4000-8000-000000000399',
      name: { en: 'X', ar: 'X' },
      priceMinor: 1,
    });
    expect(createRes.status).toBe(403);
    const listRes = await kitchen.get('/v1/products');
    expect(listRes.status).toBe(403);
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

  it('list never contains another org products', async () => {
    const demo = await asDemoOwner(agent);
    const list = await demo.get('/v1/products').query({ limit: 100 });
    expect(list.status).toBe(200);
    const items = (list.body as { items: { orgId: string }[] }).items;
    expect(items.every((p) => p.orgId === SEED_ORG.demo.id)).toBe(true);
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

  it('sets modifier groups in order on happy path', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    const product = await owner.post('/v1/products').send(productBody(categoryId));
    const productId = (product.body as { id: string }).id;

    const g1 = await owner.post('/v1/modifier-groups').send({
      name: { en: 'First', ar: 'أول' },
      minSelect: 0,
      maxSelect: 1,
    });
    const g2 = await owner.post('/v1/modifier-groups').send({
      name: { en: 'Second', ar: 'ثاني' },
      minSelect: 0,
      maxSelect: 1,
    });
    const id1 = (g1.body as { id: string }).id;
    const id2 = (g2.body as { id: string }).id;

    const linked = await owner.put(`/v1/products/${productId}/modifier-groups`).send({
      groupIds: [id2, id1],
    });
    expect(linked.status).toBe(200);
    const groups = (linked.body as { modifierGroups: { id: string; sortOrder: number }[] })
      .modifierGroups;
    expect(groups.map((g) => g.id)).toEqual([id2, id1]);
    expect(groups.map((g) => g.sortOrder)).toEqual([0, 1]);
  });

  it('400 reorder incomplete list', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    const p1 = await owner.post('/v1/products').send(productBody(categoryId, 100));
    await owner.post('/v1/products').send(productBody(categoryId, 200));
    const id1 = (p1.body as { id: string }).id;
    const res = await owner.put('/v1/products/reorder').send({
      categoryId,
      orderedIds: [id1],
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('REORDER_INCOMPLETE_LIST');
  });

  it('reorder with foreign org id returns 404 and leaves sort orders unchanged', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    const p1 = await owner.post('/v1/products').send(productBody(categoryId, 100));
    const p2 = await owner.post('/v1/products').send(productBody(categoryId, 200));
    const id1 = (p1.body as { id: string }).id;
    const id2 = (p2.body as { id: string }).id;

    const beforeList = await owner.get('/v1/products').query({ categoryId, limit: 100 });
    const before = (beforeList.body as { items: { id: string; sortOrder: number }[] }).items;
    const beforeMap = new Map(before.map((p) => [p.id, p.sortOrder]));

    const other = await asOtherOwner(agent);
    const otherCat = await other.post('/v1/categories').send(categoryBody('O', 'O'));
    const otherProduct = await other
      .post('/v1/products')
      .send(productBody((otherCat.body as { id: string }).id));
    const foreignId = (otherProduct.body as { id: string }).id;

    const reorder = await owner.put('/v1/products/reorder').send({
      categoryId,
      orderedIds: [id2, foreignId, id1],
    });
    expect(reorder.status).toBe(404);

    const afterList = await owner.get('/v1/products').query({ categoryId, limit: 100 });
    const after = (afterList.body as { items: { id: string; sortOrder: number }[] }).items;
    for (const row of after) {
      expect(row.sortOrder).toBe(beforeMap.get(row.id));
    }
  });

  it('400 for invalid priceMinor', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    const neg = await owner.post('/v1/products').send({ ...productBody(categoryId), priceMinor: -1 });
    expect(neg.status).toBe(400);
    const float = await owner
      .post('/v1/products')
      .send({ ...productBody(categoryId), priceMinor: 10.5 });
    expect(float.status).toBe(400);
  });

  it('400 when name uses locale not enabled for org', async () => {
    const owner = await asDemoOwner(agent);
    const categoryId = await createCategory(owner);
    const res = await owner.post('/v1/products').send({
      categoryId,
      name: { en: 'Ok', fr: 'Non' },
      priceMinor: 100,
    });
    expect(res.status).toBe(400);
  });

  it('404 for non-uuid product id', async () => {
    const owner = await asDemoOwner(agent);
    const res = await owner.get('/v1/products/not-a-uuid');
    expect(res.status).toBe(404);
    expect((res.body as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('patch with new categoryId appends to end of target category sort order', async () => {
    const owner = await asDemoOwner(agent);
    const catA = await createCategory(owner);
    const catBRes = await owner.post('/v1/categories').send(categoryBody('B', 'B'));
    const catB = (catBRes.body as { id: string }).id;

    await owner.post('/v1/products').send(productBody(catB, 100));
    const moving = await owner.post('/v1/products').send(productBody(catA, 200));
    const productId = (moving.body as { id: string }).id;

    const patched = await owner.patch(`/v1/products/${productId}`).send({ categoryId: catB });
    expect(patched.status).toBe(200);
    expect((patched.body as { categoryId: string; sortOrder: number }).categoryId).toBe(catB);
    expect((patched.body as { sortOrder: number }).sortOrder).toBe(1);

    const listB = await owner.get('/v1/products').query({ categoryId: catB, limit: 100 });
    const items = (listB.body as { items: { id: string; sortOrder: number }[] }).items.sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    expect(items[items.length - 1]?.id).toBe(productId);
  });
});
