import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';
import { SYSTEM_CASHIER_ROLE_ID } from '../src/modules/identity/constants';

import { asDemoOwner, asDemoKitchen, asOtherOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { authAgent, loginSeedUser, SEED_ORG } from './factories';
import { apiAgent } from './http';
import { seedCatalogProduct } from './ordering-helpers';

function postOrder(
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

describe('Ordering HTTP (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;
  let branchId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    db = app.get(DRIZZLE);
    const owner = await asDemoOwner(apiAgent(app));
    const me = await owner.get('/v1/me');
    branchId =
      (me.body as { branches: Array<{ id: string; isActive: boolean }> }).branches.find(
        (b) => b.isActive,
      )?.id ?? '';
    if (!branchId) {
      throw new Error('missing branch');
    }
    ({ productId } = await seedCatalogProduct(agent));
  });

  afterAll(async () => {
    await app.close();
  });

  it('400 when Idempotency-Key missing or mismatched', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const clientOrderId = newUuidV7();
    const body = {
      clientOrderId,
      type: 'takeaway' as const,
      items: [{ productId, quantity: 1, modifierIds: [] as string[] }],
    };
    const missing = await postOrder(owner, branchId, body);
    expect(missing.status).toBe(400);

    const mismatch = await postOrder(owner, branchId, body, newUuidV7());
    expect(mismatch.status).toBe(400);
  });

  it('201 then 200 for duplicate clientOrderId with matching header', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const clientOrderId = newUuidV7();
    const body = {
      clientOrderId,
      type: 'takeaway' as const,
      items: [{ productId, quantity: 1, modifierIds: [] as string[] }],
    };
    const first = await postOrder(owner, branchId, body, clientOrderId);
    expect(first.status).toBe(201);
    const second = await postOrder(owner, branchId, body, clientOrderId);
    expect(second.status).toBe(200);
    expect((second.body as { id: string }).id).toBe((first.body as { id: string }).id);
  });

  it('403 kitchen cannot create orders', async () => {
    const kitchen = await asDemoKitchen(apiAgent(app));
    const res = await postOrder(
      kitchen,
      branchId,
      {
        clientOrderId: newUuidV7(),
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      newUuidV7(),
    );
    expect(res.status).toBe(403);
  });

  it('kitchen can move placed order to preparing', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const clientOrderId = newUuidV7();
    const created = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(created.status).toBe(201);
    const orderId = (created.body as { id: string }).id;
    const version = (created.body as { version: number }).version;
    const kitchen = await asDemoKitchen(apiAgent(app));
    const moved = await kitchen.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'preparing',
      expectedVersion: version,
    });
    expect(moved.status).toBe(201);
    expect((moved.body as { status: string }).status).toBe('preparing');
  });

  it('403 cashier cannot cancel a preparing order', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const clientOrderId = newUuidV7();
    const created = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    const orderId = (created.body as { id: string }).id;
    let version = (created.body as { version: number }).version;
    const preparing = await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'preparing',
      expectedVersion: version,
    });
    version = (preparing.body as { version: number }).version;
    const cashier = authAgent(apiAgent(app), (await loginSeedUser(agent, 'cashier', 'demo')).accessToken);
    const cancelled = await cashier.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'No longer needed',
    });
    expect(cancelled.status).toBe(403);
  });

  it('404 for other org order and table', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const other = await asOtherOwner(apiAgent(app));
    const otherBranches = await other.get('/v1/branches');
    const otherBranchId = (otherBranches.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
    const tableLabel = `T-${newUuidV7().slice(-8)}`;
    const table = await owner.post(`/v1/branches/${branchId}/tables`).send({ label: tableLabel });
    expect(table.status).toBe(201);
    const tableId = (table.body as { id: string }).id;

    const peekTable = await other.get(`/v1/branches/${otherBranchId}/tables`);
    expect(peekTable.status).toBe(200);
    const foreignTable = await other.get(`/v1/branches/${branchId}/tables`);
    expect(foreignTable.status).toBe(404);

    const clientOrderId = newUuidV7();
    const order = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    const orderId = (order.body as { id: string }).id;
    const foreignOrder = await other.get(`/v1/branches/${branchId}/orders/${orderId}`);
    expect(foreignOrder.status).toBe(404);
    expect(tableId.length).toBeGreaterThan(0);
    expect(otherBranchId.length).toBeGreaterThan(0);
  });

  it('404 when branch is outside membership scope', async () => {
    const scopedPassword = 'scoped-ordering-user-1';
    const userId = newUuidV7();
    const membershipId = newUuidV7();
    const email = `scoped-order-${userId.slice(-8)}@example.com`;
    const passwordHash = await argon2.hash(scopedPassword, { type: argon2.argon2id });

    let allowedBranchId = '';
    let deniedBranchId = '';
    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const branchRows = await tx.execute(sql`
        SELECT id FROM branches WHERE org_id = ${SEED_ORG.demo.id}::uuid ORDER BY slug LIMIT 2
      `);
      const ids = (branchRows.rows as { id: string }[]).map((r) => r.id);
      allowedBranchId = ids[0] ?? '';
      deniedBranchId = ids[1] ?? '';
      await tx.execute(sql`
        INSERT INTO users (id, email, password_hash, name, locale, last_org_id)
        VALUES (${userId}::uuid, ${email}, ${passwordHash}, 'Scoped', 'en', ${SEED_ORG.demo.id}::uuid)
      `);
      await tx.execute(sql`
        INSERT INTO memberships (id, org_id, user_id, role_id, all_branches, status)
        VALUES (${membershipId}::uuid, ${SEED_ORG.demo.id}::uuid, ${userId}::uuid,
          ${SYSTEM_CASHIER_ROLE_ID}::uuid, false, 'active')
      `);
      await tx.execute(sql`
        INSERT INTO membership_branches (membership_id, branch_id, org_id)
        VALUES (${membershipId}::uuid, ${allowedBranchId}::uuid, ${SEED_ORG.demo.id}::uuid)
      `);
    });

    const login = await agent.post('/v1/auth/login').send({ email, password: scopedPassword });
    const token = (login.body as { accessToken: string }).accessToken;
    const scoped = authAgent(apiAgent(app), token);

    const ok = await scoped.get(`/v1/branches/${allowedBranchId}/orders`);
    expect(ok.status).toBe(200);

    const denied = await scoped.get(`/v1/branches/${deniedBranchId}/orders`);
    expect(denied.status).toBe(404);
  });

  it('hides qrToken unless branches.manage', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const cashier = authAgent(apiAgent(app), (await loginSeedUser(agent, 'cashier', 'demo')).accessToken);
    const label = `QR-${newUuidV7().slice(-6)}`;
    const created = await owner.post(`/v1/branches/${branchId}/tables`).send({ label });
    expect(created.status).toBe(201);
    expect((created.body as { qrToken?: string }).qrToken).toBeDefined();

    const cashierList = await cashier.get(`/v1/branches/${branchId}/tables`);
    expect(cashierList.status).toBe(200);
    const row = (cashierList.body as { items: Array<{ label: string; qrToken?: string }> }).items.find(
      (t) => t.label === label,
    );
    expect(row?.qrToken).toBeUndefined();

    const ownerList = await owner.get(`/v1/branches/${branchId}/tables`);
    const ownerRow = (ownerList.body as { items: Array<{ label: string; qrToken?: string }> }).items.find(
      (t) => t.label === label,
    );
    expect(ownerRow?.qrToken).toBeDefined();
  });
});
