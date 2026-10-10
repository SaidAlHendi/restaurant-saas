import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { users as usersTable } from '../src/core/db/schema/identity';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';
import { SYSTEM_CASHIER_ROLE_ID } from '../src/modules/identity/constants';
import { authAgent, loginSeedUser, SEED_ORG } from './factories';
import { apiAgent, withBranch } from './http';
import { createTestApp } from './create-test-app';

describe('Permissions (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;
  let moduleRef: TestingModule;

  const scopedPassword = 'scoped-user-password-1';
  let scopedAccessToken = '';
  let allowedBranchId = '';
  let deniedBranchId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    resetEnvCacheForTests();
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);

    const scopedUserId = newUuidV7();
    const membershipId = newUuidV7();
    const email = `scoped-${scopedUserId.slice(-8)}@example.com`;
    const passwordHash = await argon2.hash(scopedPassword, { type: argon2.argon2id });

    await db.insert(usersTable).values({
      id: scopedUserId,
      email,
      passwordHash,
      name: 'Scoped Branch User',
      locale: 'en',
      lastOrgId: SEED_ORG.demo.id,
    });

    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const branches = await tx.execute(sql`
        SELECT id FROM public.branches
        WHERE org_id = ${SEED_ORG.demo.id}::uuid
        ORDER BY slug
        LIMIT 2
      `);
      const ids = (branches.rows as { id: string }[]).map((r) => r.id);
      allowedBranchId = ids[0] ?? '';
      deniedBranchId = ids[1] ?? '';
      if (!allowedBranchId || !deniedBranchId) {
        throw new Error(
          'Need two demo branches (run migrate + seed on restaurant_saas_test before e2e)',
        );
      }

      await tx.execute(sql`
        INSERT INTO public.memberships (id, org_id, user_id, role_id, all_branches, status)
        VALUES (
          ${membershipId}::uuid,
          ${SEED_ORG.demo.id}::uuid,
          ${scopedUserId}::uuid,
          ${SYSTEM_CASHIER_ROLE_ID}::uuid,
          false,
          'active'
        )
      `);
      await tx.execute(sql`
        INSERT INTO public.membership_branches (membership_id, branch_id, org_id)
        VALUES (${membershipId}::uuid, ${allowedBranchId}::uuid, ${SEED_ORG.demo.id}::uuid)
      `);
    });

    const login = await agent.post('/v1/auth/login').send({ email, password: scopedPassword });
    if (![200, 201].includes(login.status)) {
      throw new Error(`scoped user login failed: ${JSON.stringify(login.body)}`);
    }
    scopedAccessToken = (login.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await moduleRef.close();
    await app.close();
  });

  it('cashier cannot create branches; owner can', async () => {
    const cashier = await loginSeedUser(agent, 'cashier', 'demo');
    const denied = await authAgent(agent, cashier.accessToken).post('/v1/branches').send({
      name: 'Denied Branch',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
    });
    expect(denied.status).toBe(403);

    const owner = await loginSeedUser(agent, 'owner', 'demo');
    const created = await authAgent(agent, owner.accessToken).post('/v1/branches').send({
      name: 'Allowed Branch',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
    });
    expect(created.status).toBe(201);
  });

  it('rejects invalid X-Branch-Id with 400', async () => {
    const owner = await loginSeedUser(agent, 'owner', 'demo');
    const res = await withBranch(authAgent(agent, owner.accessToken), 'not-a-uuid').get(
      '/v1/branches',
    );
    expect(res.status).toBe(400);
  });

  it('rejects branch outside membership scope with 403', async () => {
    const ok = await withBranch(authAgent(agent, scopedAccessToken), allowedBranchId).get(
      '/v1/branches',
    );
    expect(ok.status).toBe(200);

    const forbidden = await withBranch(authAgent(agent, scopedAccessToken), deniedBranchId).get(
      '/v1/branches',
    );
    expect(forbidden.status).toBe(403);
  });
});
