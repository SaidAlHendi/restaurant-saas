import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent, withBranch } from './http';

describe('Ordering list invalid business dates (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let branchId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    const owner = await asDemoOwner(agent);
    const me = await owner.get('/v1/me');
    branchId =
      (me.body as { branches: Array<{ id: string; isActive: boolean }> }).branches.find(
        (b) => b.isActive,
      )?.id ?? '';
    if (!branchId) {
      throw new Error('missing branch');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 for invalid dateFrom', async () => {
    const owner = withBranch(await asDemoOwner(agent), branchId);
    const res = await owner.get(
      `/v1/branches/${branchId}/orders?limit=20&dateFrom=2026-02-30&dateTo=2026-02-28`,
    );
    expect(res.status).toBe(400);
  });
});
