import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';
import { users as usersTable } from '../src/core/db/schema/identity';

import { asDemoKitchen, asDemoOwner, asOtherOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { authAgent, SEED_ORG } from './factories';
import { apiAgent, withBranch } from './http';
import { postOrder, seedCatalogProduct } from './ordering-helpers';

describe('Kitchen board (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;
  let branchId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    db = app.get(DRIZZLE);
    const owner = await asDemoOwner(agent);
    const me = await owner.get('/v1/me');
    branchId = (me.body as { branches: Array<{ id: string }> }).branches[0]?.id ?? '';
    ({ productId } = await seedCatalogProduct(agent));
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns only placed, preparing, and ready orders sorted by placedAt', async () => {
    const owner = await asDemoOwner(agent);
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
    const kitchen = await asDemoKitchen(agent);
    const board = await kitchen.get(`/v1/branches/${branchId}/kitchen/board`);
    expect(board.status).toBe(200);
    const orders = (board.body as { orders: Array<{ id: string; status: string }> }).orders;
    expect(orders.some((o) => o.id === (created.body as { id: string }).id)).toBe(true);
    for (const order of orders) {
      expect(['placed', 'preparing', 'ready']).toContain(order.status);
    }
  });

  it('404 for other tenant branch', async () => {
    const other = await asOtherOwner(agent);
    const kitchen = await asDemoKitchen(agent);
    const otherMe = await other.get('/v1/me');
    const otherBranchId = (otherMe.body as { branches: Array<{ id: string }> }).branches[0]?.id ?? '';
    const res = await kitchen.get(`/v1/branches/${otherBranchId}/kitchen/board`);
    expect(res.status).toBe(404);
  });

  it('403 item status for read-only custom role', async () => {
    const owner = await asDemoOwner(agent);
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
    const itemId = (created.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
    const version = (created.body as { version: number }).version;

    const readOnlyUserId = newUuidV7();
    const membershipId = newUuidV7();
    const roleId = newUuidV7();
    const email = `kds-read-${readOnlyUserId.slice(-8)}@demo.local`;
    const passwordHash = await argon2.hash('read-only-kitchen-pw', { type: argon2.argon2id });

    await db.insert(usersTable).values({
      id: readOnlyUserId,
      email,
      passwordHash,
      name: 'KDS read only',
      locale: 'en',
      lastOrgId: SEED_ORG.demo.id,
    });

    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      await tx.execute(sql`
        INSERT INTO public.roles (id, org_id, key, name, is_system)
        VALUES (${roleId}::uuid, ${SEED_ORG.demo.id}::uuid, ${`kds_ro_${readOnlyUserId.slice(-8)}`}, 'KDS read', false)
      `);
      await tx.execute(sql`
        INSERT INTO public.role_permissions (role_id, permission_key, org_id)
        VALUES (${roleId}::uuid, 'orders.read', ${SEED_ORG.demo.id}::uuid)
      `);
      await tx.execute(sql`
        INSERT INTO public.memberships (id, org_id, user_id, role_id, all_branches, status)
        VALUES (
          ${membershipId}::uuid,
          ${SEED_ORG.demo.id}::uuid,
          ${readOnlyUserId}::uuid,
          ${roleId}::uuid,
          true,
          'active'
        )
      `);
    });

    const login = await agent.post('/v1/auth/login').send({
      email,
      password: 'read-only-kitchen-pw',
    });
    const token = (login.body as { accessToken: string }).accessToken;
    const readOnly = withBranch(authAgent(agent, token), branchId);

    const board = await readOnly.get(`/v1/branches/${branchId}/kitchen/board`);
    expect(board.status).toBe(200);

    const denied = await readOnly
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/status`)
      .send({ to: 'ready', expectedVersion: version });
    expect(denied.status).toBe(403);
  });
});

describe('Kitchen item status (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let branchId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    const owner = await asDemoOwner(agent);
    const me = await owner.get('/v1/me');
    branchId = (me.body as { branches: Array<{ id: string }> }).branches[0]?.id ?? '';
    ({ productId } = await seedCatalogProduct(agent));
  });

  afterAll(async () => {
    await app.close();
  });

  it('marks item ready and returns 409 on stale version', async () => {
    const owner = await asDemoOwner(agent);
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
    const itemId = (created.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
    const version = (created.body as { version: number }).version;
    const kitchen = await asDemoKitchen(agent);

    const ok = await kitchen
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/status`)
      .send({ to: 'ready', expectedVersion: version });
    expect(ok.status).toBe(201);

    const conflict = await kitchen
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/status`)
      .send({ to: 'not_ready', expectedVersion: version });
    expect(conflict.status).toBe(409);
  });

  it('422 when order is completed', async () => {
    const owner = await asDemoOwner(agent);
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
    const itemId = (created.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
    let version = (created.body as { version: number }).version;
    const kitchen = await asDemoKitchen(agent);

    for (const to of ['preparing', 'ready'] as const) {
      const moved = await kitchen.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
        to,
        expectedVersion: version,
      });
      expect(moved.status).toBe(201);
      version = (moved.body as { version: number }).version;
    }

    const totalMinor = (created.body as { totalMinor: number }).totalMinor;
    const paid = await owner
      .post(`/v1/branches/${branchId}/orders/${orderId}/payments`)
      .set('Idempotency-Key', newUuidV7())
      .send({
        clientPaymentId: newUuidV7(),
        method: 'cash',
        amountMinor: totalMinor,
        tenderedMinor: totalMinor,
        expectedVersion: version,
      });
    expect(paid.status).toBe(201);
    const afterPay = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    version = (afterPay.body as { version: number }).version;

    const completed = await owner.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
      to: 'completed',
      expectedVersion: version,
    });
    expect(completed.status).toBe(201);
    const versionAfterComplete = (completed.body as { version: number }).version;

    const res = await kitchen
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/status`)
      .send({ to: 'ready', expectedVersion: versionAfterComplete });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('ORDER_NOT_EDITABLE');
  });

  it('422 when item is voided', async () => {
    const owner = await asDemoOwner(agent);
    const clientOrderId = newUuidV7();
    const created = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        items: [
          { productId, quantity: 1, modifierIds: [] },
          { productId, quantity: 1, modifierIds: [] },
        ],
      },
      clientOrderId,
    );
    const orderId = (created.body as { id: string }).id;
    const items = (created.body as { items: Array<{ id: string }> }).items;
    const itemId = items[0]?.id ?? '';
    let version = (created.body as { version: number }).version;
    const kitchen = await asDemoKitchen(agent);

    const voided = await owner
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/void`)
      .send({ reason: 'mistake', expectedVersion: version });
    expect(voided.status).toBe(201);
    version = (voided.body as { version: number }).version;

    const res = await kitchen
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/status`)
      .send({ to: 'ready', expectedVersion: version });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('ITEM_VOIDED');
  });
});
