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

  it('happy path group and modifier CRUD', async () => {
    const owner = await asDemoOwner(agent);
    const group = await owner.post('/v1/modifier-groups').send({
      name: { en: 'Extras', ar: 'إضافات' },
      minSelect: 0,
      maxSelect: 2,
    });
    expect(group.status).toBe(201);
    const groupId = (group.body as { id: string }).id;

    const modifier = await owner.post(`/v1/modifier-groups/${groupId}/modifiers`).send({
      name: { en: 'Cheese', ar: 'جبن' },
      priceDeltaMinor: 300,
    });
    expect(modifier.status).toBe(201);

    const detail = await owner.get(`/v1/modifier-groups/${groupId}`);
    expect(detail.status).toBe(200);
    expect((detail.body as { modifiers: unknown[] }).modifiers.length).toBeGreaterThan(0);
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

  it('404 other org group', async () => {
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
  });
});
