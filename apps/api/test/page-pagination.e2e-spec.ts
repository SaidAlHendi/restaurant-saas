import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { asDemoOwner, categoryBody } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';

interface Page {
  items: { id: string }[];
  page: number;
  pageSize: number;
  total: number;
}

describe('page + pageSize pagination (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns every row when page and pageSize are omitted', async () => {
    const owner = await asDemoOwner(agent);
    for (const name of ['Pg A', 'Pg B', 'Pg C']) {
      expect((await owner.post('/v1/categories').send(categoryBody(name, name))).status).toBe(201);
    }
    const all = (await owner.get('/v1/categories')).body as Page;
    expect(all.items.length).toBe(all.total);
    expect(all.page).toBe(1);
    expect(all.pageSize).toBe(Math.max(all.total, 1));
  });

  it('pages categories without overlap and reports the total', async () => {
    const owner = await asDemoOwner(agent);
    const all = (await owner.get('/v1/categories')).body as Page;
    const p1 = (await owner.get('/v1/categories?page=1&pageSize=2')).body as Page;
    const p2 = (await owner.get('/v1/categories?page=2&pageSize=2')).body as Page;
    expect(p1.items).toHaveLength(2);
    expect(p1.total).toBe(all.total);
    expect(p1.page).toBe(1);
    expect(p1.pageSize).toBe(2);
    expect(p2.page).toBe(2);
    expect(p1.items.map((c) => c.id)).toEqual(all.items.slice(0, 2).map((c) => c.id));
    expect(p2.items.map((c) => c.id)).toEqual(all.items.slice(2, 4).map((c) => c.id));
  });

  it('pages staff, memberships, branches, devices and modifier groups', async () => {
    const owner = await asDemoOwner(agent);
    for (const path of [
      '/v1/staff',
      '/v1/memberships',
      '/v1/branches',
      '/v1/devices',
      '/v1/modifier-groups',
    ]) {
      const res = await owner.get(`${path}?page=1&pageSize=1`);
      expect(res.status).toBe(200);
      const body = res.body as Page;
      expect(body.items.length).toBeLessThanOrEqual(1);
      expect(body.pageSize).toBe(1);
      expect(body.total).toBeGreaterThanOrEqual(body.items.length);
    }
  });

  it('rejects out-of-range values', async () => {
    const owner = await asDemoOwner(agent);
    expect((await owner.get('/v1/categories?page=0')).status).toBe(400);
    expect((await owner.get('/v1/categories?pageSize=101')).status).toBe(400);
  });
});
