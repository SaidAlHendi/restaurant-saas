import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { apiAgent } from './http';
import { createTestApp } from './create-test-app';
import { asDemoOwner, asOtherOwner } from './catalog-helpers';

describe('Catalog modifier groups (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('happy path group and modifier CRUD with reorder', async () => {
    const owner = await asDemoOwner(agent);
    const group = await owner.post('/v1/modifier-groups').send({
      name: { en: 'Extras', ar: 'إضافات' },
      minSelect: 0,
      maxSelect: 2,
    });
    expect(group.status).toBe(201);
    const groupId = (group.body as { id: string }).id;

    const m1 = await owner.post(`/v1/modifier-groups/${groupId}/modifiers`).send({
      name: { en: 'Cheese', ar: 'جبن' },
      priceDeltaMinor: 300,
    });
    const m2 = await owner.post(`/v1/modifier-groups/${groupId}/modifiers`).send({
      name: { en: 'Bacon', ar: 'لحم' },
      priceDeltaMinor: 500,
    });
    expect(m1.status).toBe(201);
    expect(m2.status).toBe(201);
    const id1 = (m1.body as { id: string }).id;
    const id2 = (m2.body as { id: string }).id;

    const patched = await owner
      .patch(`/v1/modifier-groups/${groupId}/modifiers/${id1}`)
      .send({ priceDeltaMinor: 350 });
    expect(patched.status).toBe(200);
    expect((patched.body as { priceDeltaMinor: number }).priceDeltaMinor).toBe(350);

    const reordered = await owner
      .put(`/v1/modifier-groups/${groupId}/modifiers/reorder`)
      .send({ orderedIds: [id2, id1] });
    expect(reordered.status).toBe(200);
    const items = (reordered.body as { items: { id: string; sortOrder: number }[] }).items;
    expect(items.map((i) => i.id)).toEqual([id2, id1]);

    const removed = await owner.delete(`/v1/modifier-groups/${groupId}/modifiers/${id2}`);
    expect(removed.status).toBe(200);

    const detail = await owner.get(`/v1/modifier-groups/${groupId}`);
    expect(detail.status).toBe(200);
    expect((detail.body as { modifiers: { id: string }[] }).modifiers.map((m) => m.id)).toEqual([
      id1,
    ]);
  });

  it('400 validation on modifier group bounds', async () => {
    const owner = await asDemoOwner(agent);
    const res = await owner.post('/v1/modifier-groups').send({
      name: { en: 'Bad', ar: 'Bad' },
      minSelect: 3,
      maxSelect: 1,
    });
    expect(res.status).toBe(400);
  });

  it('404 other org group and non-uuid group id', async () => {
    const other = await asOtherOwner(agent);
    const group = await other.post('/v1/modifier-groups').send({
      name: { en: 'Secret', ar: 'Secret' },
      minSelect: 0,
      maxSelect: 1,
    });
    const groupId = (group.body as { id: string }).id;
    const demo = await asDemoOwner(agent);
    const get = await demo.get(`/v1/modifier-groups/${groupId}`);
    expect(get.status).toBe(404);

    const bad = await demo.get('/v1/modifier-groups/not-a-uuid');
    expect(bad.status).toBe(404);
  });
});
