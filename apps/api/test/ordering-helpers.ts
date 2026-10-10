import { and, eq, sql } from 'drizzle-orm';
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
import { asDemoOwner, categoryBody, productBody } from './catalog-helpers';
import { computeBusinessDate } from '../src/lib/business-date';
import { branches } from '../src/core/db/schema/tenancy';

export async function readBranchCounter(
  db: DrizzleDb,
  orgId: string,
  branchId: string,
  businessDate: string,
): Promise<number> {
  let value = 0;
  await withOrg(db, orgId, async (tx) => {
    const row = await tx.execute(sql`
      SELECT coalesce(last_order_number, 0)::int AS n FROM branch_counters
      WHERE branch_id = ${branchId}::uuid AND business_date = ${businessDate}::date
    `);
    value = (row.rows[0] as { n: number } | undefined)?.n ?? 0;
  });
  return value;
}

export async function countOrderEvents(db: DrizzleDb, orgId: string): Promise<number> {
  let count = 0;
  await withOrg(db, orgId, async (tx) => {
    const row = await tx.execute(sql`SELECT count(*)::int AS c FROM order_events`);
    count = (row.rows[0] as { c: number }).c;
  });
  return count;
}

export async function demoBranchIds(agent: Agent, db: DrizzleDb): Promise<string[]> {
  await withOrg(db, SEED_ORG.demo.id, async (tx) => {
    const rows = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.orgId, SEED_ORG.demo.id));
    if (rows.length < 2) {
      throw new Error('need two demo branches');
    }
  });
  const { accessToken } = await loginSeedUser(agent, 'owner', 'demo');
  const me = await authAgent(agent, accessToken).get('/v1/me');
  return (me.body as { branches: Array<{ id: string }> }).branches.map((b) => b.id);
}

export async function seedProductWithRequiredModifier(agent: Agent): Promise<{
  productId: string;
  groupId: string;
  modifierId: string;
}> {
  const owner = await asDemoOwner(agent);
  const cat = await owner.post('/v1/categories').send(categoryBody());
  const categoryId = (cat.body as { id: string }).id;
  const prod = await owner.post('/v1/products').send(productBody(categoryId));
  const productId = (prod.body as { id: string }).id;
  const group = await owner.post('/v1/modifier-groups').send({
    name: { en: 'Size', ar: 'حجم' },
    minSelect: 1,
    maxSelect: 1,
  });
  const groupId = (group.body as { id: string }).id;
  const mod = await owner.post(`/v1/modifier-groups/${groupId}/modifiers`).send({
    name: { en: 'Large', ar: 'كبير' },
    priceDeltaMinor: 100,
  });
  const modifierId = (mod.body as { id: string }).id;
  await owner.put(`/v1/products/${productId}/modifier-groups`).send({ groupIds: [groupId] });
  return { productId, groupId, modifierId };
}

export async function seedProductWithTwoModifiersMaxOne(agent: Agent): Promise<{
  productId: string;
  modifierIdA: string;
  modifierIdB: string;
}> {
  const owner = await asDemoOwner(agent);
  const cat = await owner.post('/v1/categories').send(categoryBody());
  const categoryId = (cat.body as { id: string }).id;
  const prod = await owner.post('/v1/products').send(productBody(categoryId));
  const productId = (prod.body as { id: string }).id;
  const group = await owner.post('/v1/modifier-groups').send({
    name: { en: 'Pick one', ar: 'اختر واحد' },
    minSelect: 0,
    maxSelect: 1,
  });
  const groupId = (group.body as { id: string }).id;
  const modA = await owner.post(`/v1/modifier-groups/${groupId}/modifiers`).send({
    name: { en: 'A', ar: 'أ' },
    priceDeltaMinor: 0,
  });
  const modB = await owner.post(`/v1/modifier-groups/${groupId}/modifiers`).send({
    name: { en: 'B', ar: 'ب' },
    priceDeltaMinor: 0,
  });
  const modifierIdA = (modA.body as { id: string }).id;
  const modifierIdB = (modB.body as { id: string }).id;
  await owner.put(`/v1/products/${productId}/modifier-groups`).send({ groupIds: [groupId] });
  return { productId, modifierIdA, modifierIdB };
}

export function businessDateForBranch(timezone: string, dayStartHour: number, now: Date): string {
  return computeBusinessDate({ now, timezone, dayStartHour });
}

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
  const activeBranches = body.branches.filter((b) => b.isActive);
  const branchId = activeBranches[0]?.id;
  if (!branchId) {
    throw new Error('demo org has no active branch');
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
    branchIds: activeBranches.map((b) => b.id),
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
