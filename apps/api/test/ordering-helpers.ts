import { and, eq } from 'drizzle-orm';
import type { Agent } from 'supertest';

import type { RequestContext } from '../src/core/context/request-context';
import { users } from '../src/core/db/schema/identity';
import { memberships } from '../src/core/db/schema/tenancy';
import type { DrizzleDb } from '../src/core/db/db.module';
import { diningTables } from '../src/core/db/schema/ordering';
import { withOrg } from '../src/core/db/with-org';
import { generateQrToken } from '../src/lib/qr-token';
import { newUuidV7 } from '../src/lib/uuid';

import { authAgent, loginSeedUser, SEED_ORG } from './factories';
import { categoryBody, productBody } from './catalog-helpers';

export async function demoOwnerContext(
  agent: Agent,
  db: DrizzleDb,
): Promise<{
  ctx: RequestContext;
  branchId: string;
}> {
  const { accessToken } = await loginSeedUser(agent, 'owner', 'demo');
  const client = authAgent(agent, accessToken);
  const me = await client.get('/v1/me');
  if (me.status !== 200) {
    throw new Error(`me failed: ${JSON.stringify(me.body)}`);
  }
  const body = me.body as {
    org: { id: string };
    permissions: string[];
    branches: Array<{ id: string }>;
    user: { id: string };
  };
  const branchId = body.branches[0]?.id;
  if (!branchId) {
    throw new Error('demo org has no branch');
  }
  let membershipId = '';
  await withOrg(db, SEED_ORG.demo.id, async (tx) => {
    const rows = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.orgId, SEED_ORG.demo.id), eq(users.email, 'owner@demo.local')))
      .limit(1);
    membershipId = rows[0]?.id ?? '';
  });
  if (!membershipId) {
    throw new Error('owner membership not found');
  }
  const ctx: RequestContext = {
    userId: body.user.id,
    orgId: body.org.id,
    membershipId,
    sessionId: newUuidV7(),
    branchIds: body.branches.map((b) => b.id),
    allBranches: true,
    permissions: body.permissions,
    currentBranchId: branchId,
  };
  return { ctx, branchId };
}

export async function seedCatalogProduct(agent: Agent): Promise<{ categoryId: string; productId: string }> {
  const { accessToken } = await loginSeedUser(agent, 'owner', 'demo');
  const client = authAgent(agent, accessToken);
  const cat = await client.post('/v1/categories').send(categoryBody());
  if (cat.status !== 201) {
    throw new Error(`category create failed: ${JSON.stringify(cat.body)}`);
  }
  const categoryId = (cat.body as { id: string }).id;
  const prod = await client.post('/v1/products').send(productBody(categoryId, 2500));
  if (prod.status !== 201) {
    throw new Error(`product create failed: ${JSON.stringify(prod.body)}`);
  }
  return { categoryId, productId: (prod.body as { id: string }).id };
}

export async function insertDiningTable(
  db: DrizzleDb,
  orgId: string,
  branchId: string,
  label: string,
): Promise<string> {
  const id = newUuidV7();
  await withOrg(db, orgId, async (tx) => {
    await tx.insert(diningTables).values({
      id,
      orgId,
      branchId,
      label,
      qrToken: generateQrToken(),
      isActive: true,
    });
  });
  return id;
}
