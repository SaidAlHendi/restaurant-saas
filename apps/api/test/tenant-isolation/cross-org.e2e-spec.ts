import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { authAgent, loginSeedUser, SEED_ORG } from '../factories';
import { apiAgent } from '../http';
import { createTestApp } from '../create-test-app';

type BranchListResponse = { items: { id: string; orgId: string }[] };

describe('Cross-tenant API isolation (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('org A token cannot patch org B branch (404)', async () => {
    const otherOwner = await loginSeedUser(agent, 'owner', 'other');
    const otherList = await authAgent(agent, otherOwner.accessToken).get('/v1/branches');
    const otherBranchId = (otherList.body as BranchListResponse).items[0]?.id;
    expect(otherBranchId).toBeDefined();

    const demoOwner = await loginSeedUser(agent, 'owner', 'demo');
    const patch = await authAgent(agent, demoOwner.accessToken)
      .patch(`/v1/branches/${otherBranchId ?? ''}`)
      .send({ isActive: false });
    expect(patch.status).toBe(404);
  });

  it('branch lists never include another org id', async () => {
    const demoOwner = await loginSeedUser(agent, 'owner', 'demo');
    const demoList = await authAgent(agent, demoOwner.accessToken).get('/v1/branches');
    const demoItems = (demoList.body as BranchListResponse).items;
    expect(demoItems.length).toBeGreaterThan(0);
    expect(demoItems.every((b) => b.orgId === SEED_ORG.demo.id)).toBe(true);
  });
});
