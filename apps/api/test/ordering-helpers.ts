import { and, eq, sql } from 'drizzle-orm';
import type { Agent } from 'supertest';

import type { RequestContext } from '../src/core/context/request-context';
import { users } from '../src/core/db/schema/identity';
import { memberships } from '../src/core/db/schema/tenancy';
import pg from 'pg';

import { loadEnv } from '../src/config/env';
import type { DrizzleDb } from '../src/core/db/db.module';
import { diningTables, orders } from '../src/core/db/schema/ordering';
import { withOrg } from '../src/core/db/with-org';
import { generateQrToken } from '../src/lib/qr-token';
import { newUuidV7 } from '../src/lib/uuid';

import { authAgent, loginSeedUser, SEED_ORG } from './factories';
import { asDemoOwner, categoryBody, productBody } from './catalog-helpers';
import { computeBusinessDate } from '../src/lib/business-date';
import { branches } from '../src/core/db/schema/tenancy';

export function postOrder(
  client: Agent,
  branchId: string,
  body: {
    clientOrderId: string;
    type: 'takeaway' | 'dine_in';
    tableId?: string;
    items: Array<{ productId: string; quantity: number; modifierIds: string[] }>;
  },
  idempotencyKey?: string,
) {
  const base = client.post(`/v1/branches/${branchId}/orders`);
  const req = idempotencyKey === undefined ? base : base.set('Idempotency-Key', idempotencyKey);
  return req.send(body);
}

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

export async function createIsolatedBranch(
  owner: Agent,
  opts?: { payBeforeSend?: boolean; acceptsCard?: boolean },
): Promise<{ branchId: string }> {
  const slug = `t-${newUuidV7().slice(-8)}`;
  const create = await owner.post('/v1/branches').send({
    name: `Test branch ${slug}`,
    slug,
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    taxRateBp: 1500,
    taxInclusive: false,
    dayStartHour: 4,
  });
  if (create.status !== 201) {
    throw new Error(`branch create failed: ${JSON.stringify(create.body)}`);
  }
  const branchId = (create.body as { id: string }).id;
  if (opts?.payBeforeSend !== undefined || opts?.acceptsCard !== undefined) {
    const patchBody: { payBeforeSend?: boolean; acceptsCard?: boolean } = {};
    if (opts.payBeforeSend !== undefined) {
      patchBody.payBeforeSend = opts.payBeforeSend;
    }
    if (opts.acceptsCard !== undefined) {
      patchBody.acceptsCard = opts.acceptsCard;
    }
    const patch = await owner.patch(`/v1/branches/${branchId}`).send(patchBody);
    if (patch.status !== 200) {
      throw new Error(`branch patch failed: ${JSON.stringify(patch.body)}`);
    }
  }
  return { branchId };
}

export function postPayment(
  client: Agent,
  branchId: string,
  orderId: string,
  body: {
    clientPaymentId: string;
    expectedVersion: number;
    method: 'cash' | 'card';
    amountMinor: number;
    tenderedMinor?: number;
  },
  idempotencyKey?: string,
) {
  const base = client.post(`/v1/branches/${branchId}/orders/${orderId}/payments`);
  const req = idempotencyKey === undefined ? base : base.set('Idempotency-Key', idempotencyKey);
  return req.send(body);
}

export async function listOrderEventTypes(
  db: DrizzleDb,
  orgId: string,
  orderId: string,
): Promise<string[]> {
  let types: string[] = [];
  await withOrg(db, orgId, async (tx) => {
    const row = await tx.execute(sql`
      SELECT type FROM order_events
      WHERE order_id = ${orderId}::uuid
      ORDER BY created_at ASC, id ASC
    `);
    types = row.rows.map((r) => (r as { type: string }).type);
  });
  return types;
}

export async function lastOutboxChangeForOrder(
  orgId: string,
  orderId: string,
): Promise<string | null> {
  const env = loadEnv();
  if (!env.DATABASE_WORKER_URL) {
    throw new Error('DATABASE_WORKER_URL is required for this assertion');
  }
  const pool = new pg.Pool({ connectionString: env.DATABASE_WORKER_URL });
  try {
    const result = await pool.query<{ change: string | null }>(
      `SELECT payload->>'change' AS change FROM outbox_events
       WHERE org_id = $1::uuid AND aggregate_id = $2::uuid
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [orgId, orderId],
    );
    return result.rows[0]?.change ?? null;
  } finally {
    await pool.end();
  }
}

export async function insertPlacedOrderForBusinessDate(
  db: DrizzleDb,
  input: {
    orgId: string;
    branchId: string;
    businessDate: string;
    orderNumber: number;
    createdByMembershipId: string;
    totalMinor?: number;
  },
): Promise<string> {
  const id = newUuidV7();
  const clientOrderId = newUuidV7();
  const total = input.totalMinor ?? 2500;
  const now = new Date();
  await withOrg(db, input.orgId, async (tx) => {
    await tx.insert(orders).values({
      id,
      orgId: input.orgId,
      branchId: input.branchId,
      clientOrderId,
      orderNumber: input.orderNumber,
      businessDate: input.businessDate,
      type: 'takeaway',
      status: 'placed',
      paymentStatus: 'unpaid',
      tableId: null,
      customerName: null,
      notes: null,
      subtotalMinor: total,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: total,
      currency: 'SAR',
      version: 1,
      placedAt: now,
      createdBy: input.createdByMembershipId,
      createdAt: now,
      updatedAt: now,
    });
  });
  return id;
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
