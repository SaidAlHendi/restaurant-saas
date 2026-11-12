import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { authAgent, loginSeedUser, SEED_ORG } from './factories';
import { apiAgent } from './http';
import { createTestApp } from './create-test-app';

type StaffItem = { id: string; roleKey: string };
type MeBody = { permissions: string[] };
type OverridesBody = { grant: string[]; deny: string[]; effective: string[] };

describe('Staff permission overrides (e2e)', () => {
  let app: INestApplication;
  let owner: Agent;
  let manager: Agent;
  let otherOwner: Agent;
  let ownerMembershipId = '';
  let managerMembershipId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    // authAgent sets the token on the agent it is given, so each role needs its own agent.
    const ownerBase = apiAgent(app);
    const managerBase = apiAgent(app);
    owner = authAgent(ownerBase, (await loginSeedUser(ownerBase, 'owner', 'demo')).accessToken);
    manager = authAgent(managerBase, (await loginSeedUser(managerBase, 'manager', 'demo')).accessToken);
    const otherBase = apiAgent(app);
    otherOwner = authAgent(otherBase, (await loginSeedUser(otherBase, 'owner', 'other')).accessToken);
    const list = await owner.get('/v1/staff').expect(200);
    const items = (list.body as { items: StaffItem[] }).items;
    ownerMembershipId = items.find((i) => i.roleKey === 'owner')?.id ?? '';
    managerMembershipId = items.find((i) => i.roleKey === 'manager')?.id ?? '';
    expect(SEED_ORG.demo.id).toBeTruthy();
  });

  afterAll(async () => {
    await owner
      .put(`/v1/staff/${managerMembershipId}/permissions`)
      .send({ grant: [], deny: [] });
    await app.close();
  });

  async function managerPermissions(): Promise<string[]> {
    const res = await manager.get('/v1/me').expect(200);
    return (res.body as MeBody).permissions;
  }

  it('lets only the owner read or change overrides', async () => {
    await manager.get(`/v1/staff/${managerMembershipId}/permissions`).expect(403);
    await manager
      .put(`/v1/staff/${managerMembershipId}/permissions`)
      .send({ grant: ['tables.rotate_qr'], deny: [] })
      .expect(403);
  });

  it('grants one manager an extra permission and revokes it again', async () => {
    expect(await managerPermissions()).not.toContain('tables.rotate_qr');

    const put = await owner
      .put(`/v1/staff/${managerMembershipId}/permissions`)
      .send({ grant: ['tables.rotate_qr'], deny: [] })
      .expect(200);
    expect((put.body as OverridesBody).effective).toContain('tables.rotate_qr');
    expect(await managerPermissions()).toContain('tables.rotate_qr');

    await owner
      .put(`/v1/staff/${managerMembershipId}/permissions`)
      .send({ grant: [], deny: [] })
      .expect(200);
    expect(await managerPermissions()).not.toContain('tables.rotate_qr');
  });

  it('denies a permission the role would otherwise grant', async () => {
    expect(await managerPermissions()).toContain('menu.manage');
    await owner
      .put(`/v1/staff/${managerMembershipId}/permissions`)
      .send({ grant: [], deny: ['menu.manage'] })
      .expect(200);
    expect(await managerPermissions()).not.toContain('menu.manage');
  });

  it('rejects conflicting, owner-only and owner-target requests', async () => {
    await owner
      .put(`/v1/staff/${managerMembershipId}/permissions`)
      .send({ grant: ['menu.manage'], deny: ['menu.manage'] })
      .expect(400);
    await owner
      .put(`/v1/staff/${managerMembershipId}/permissions`)
      .send({ grant: ['billing.manage'], deny: [] })
      .expect(400);
    await owner
      .put(`/v1/staff/${ownerMembershipId}/permissions`)
      .send({ grant: [], deny: ['menu.manage'] })
      .expect(403);
  });

  it('hides memberships of other restaurants and rejects non-UUID ids', async () => {
    await otherOwner.get(`/v1/staff/${managerMembershipId}/permissions`).expect(404);
    await otherOwner
      .put(`/v1/staff/${managerMembershipId}/permissions`)
      .send({ grant: ['tables.rotate_qr'], deny: [] })
      .expect(404);
    expect(await managerPermissions()).not.toContain('tables.rotate_qr');
    await owner.get('/v1/staff/not-a-uuid/permissions').expect(400);
  });
});
