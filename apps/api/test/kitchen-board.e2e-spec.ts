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
import { postOrder, seedCatalogProduct, seedProductWithRequiredModifier } from './ordering-helpers';

async function createKitchenTestBranch(owner: Agent): Promise<string> {
  const slug = `kds-${newUuidV7().slice(-8)}`;
  const res = await owner.post('/v1/branches').send({
    name: 'KDS test branch',
    slug,
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
  });
  if (res.status !== 201) {
    throw new Error(`branch create failed ${String(res.status)}`);
  }
  return (res.body as { id: string }).id;
}

describe('Kitchen board (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let branchId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    db = app.get(DRIZZLE);
    const owner = await asDemoOwner(apiAgent(app));
    branchId = await createKitchenTestBranch(owner);
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns only placed, preparing, and ready orders sorted by placedAt', async () => {
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
    const kitchen = await asDemoKitchen(apiAgent(app));
    const board = await kitchen.get(`/v1/branches/${branchId}/kitchen/board`);
    expect(board.status).toBe(200);
    const orders = (board.body as { orders: Array<{ id: string; status: string }> }).orders;
    expect(orders.some((o) => o.id === (created.body as { id: string }).id)).toBe(true);
    for (const order of orders) {
      expect(['placed', 'preparing', 'ready']).toContain(order.status);
    }
    const placedAtValues = orders.map((o) => (o as { placedAt?: string }).placedAt ?? '');
    const sorted = [...placedAtValues].sort();
    expect(placedAtValues).toEqual(sorted);
  });

  it('404 for other tenant branch', async () => {
    const other = await asOtherOwner(apiAgent(app));
    const slug = `kds-x-${newUuidV7().slice(-8)}`;
    const createdBranch = await other.post('/v1/branches').send({
      name: 'Other org KDS branch',
      slug,
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
    });
    expect(createdBranch.status).toBe(201);
    const otherBranchId = (createdBranch.body as { id: string }).id;
    expect(otherBranchId).not.toBe(branchId);

    const kitchen = await asDemoKitchen(apiAgent(app));
    const res = await kitchen.get(`/v1/branches/${otherBranchId}/kitchen/board`);
    expect(res.status).toBe(404);
  });

  it('403 item status for read-only custom role', async () => {
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

    const loginAgent = apiAgent(app);
    const login = await loginAgent.post('/v1/auth/login').send({
      email,
      password: 'read-only-kitchen-pw',
    });
    const token = (login.body as { accessToken: string }).accessToken;
    const readOnly = withBranch(authAgent(apiAgent(app), token), branchId);

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
  let branchId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    const owner = await asDemoOwner(apiAgent(app));
    branchId = await createKitchenTestBranch(owner);
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
  });

  afterAll(async () => {
    await app.close();
  });

  it('marks item ready and returns 409 on stale version', async () => {
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
    const itemId = (created.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
    const version = (created.body as { version: number }).version;
    const kitchen = await asDemoKitchen(apiAgent(app));

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
    const itemId = (created.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
    let version = (created.body as { version: number }).version;
    const kitchen = await asDemoKitchen(apiAgent(app));

    for (const to of ['preparing', 'ready'] as const) {
      const moved = await kitchen.post(`/v1/branches/${branchId}/orders/${orderId}/status`).send({
        to,
        expectedVersion: version,
      });
      expect(moved.status).toBe(201);
      version = (moved.body as { version: number }).version;
    }

    const totalMinor = (created.body as { totalMinor: number }).totalMinor;
    const clientPaymentId = newUuidV7();
    const paid = await owner
      .post(`/v1/branches/${branchId}/orders/${orderId}/payments`)
      .set('Idempotency-Key', clientPaymentId)
      .send({
        clientPaymentId,
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
    const owner = await asDemoOwner(apiAgent(app));
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

    const voided = await owner
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/void`)
      .send({ reason: 'mistake', expectedVersion: version });
    expect(voided.status).toBe(201);
    version = (voided.body as { version: number }).version;

    const kitchen = await asDemoKitchen(apiAgent(app));
    const res = await kitchen
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/status`)
      .send({ to: 'ready', expectedVersion: version });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('ITEM_VOIDED');
  });

  it('returns table label, modifiers, additions and voided items on the card', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const tableLabel = `K-${newUuidV7().slice(-6)}`;
    const table = await owner.post(`/v1/branches/${branchId}/tables`).send({ label: tableLabel });
    expect(table.status).toBe(201);
    const tableId = (table.body as { id: string }).id;
    const withMod = await seedProductWithRequiredModifier(apiAgent(app));

    const clientOrderId = newUuidV7();
    const created = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'dine_in',
        tableId,
        items: [
          { productId: withMod.productId, quantity: 2, modifierIds: [withMod.modifierId] },
          { productId, quantity: 1, modifierIds: [] },
        ],
      },
      clientOrderId,
    );
    expect(created.status).toBe(201);
    const orderId = (created.body as { id: string }).id;
    const voidItemId = (created.body as { items: Array<{ id: string }> }).items[1]?.id ?? '';
    let version = (created.body as { version: number }).version;

    const voided = await owner
      .post(`/v1/branches/${branchId}/orders/${orderId}/items/${voidItemId}/void`)
      .send({ reason: 'customer changed mind', expectedVersion: version });
    expect(voided.status).toBe(201);
    version = (voided.body as { version: number }).version;

    const added = await owner.post(`/v1/branches/${branchId}/orders/${orderId}/items`).send({
      expectedVersion: version,
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    expect(added.status).toBe(201);

    const kitchen = await asDemoKitchen(apiAgent(app));
    const board = await kitchen.get(`/v1/branches/${branchId}/kitchen/board`);
    expect(board.status).toBe(200);
    type Card = {
      id: string;
      tableLabel: string | null;
      items: Array<{
        id: string;
        isAddition: boolean;
        voidedAt: string | null;
        voidReason: string | null;
        quantity: number;
        modifiers: Array<{ name: Record<string, string> }>;
      }>;
    };
    const body = board.body as { serverTime: string; orders: Card[] };
    expect(Number.isNaN(Date.parse(body.serverTime))).toBe(false);
    const card = body.orders.find((o) => o.id === orderId);
    expect(card?.tableLabel).toBe(tableLabel);
    expect(card?.items).toHaveLength(3);
    const modItem = card?.items.find((i) => i.modifiers.length > 0);
    expect(modItem?.quantity).toBe(2);
    expect(modItem?.modifiers[0]?.name['en']).toBe('Large');
    const voidedItem = card?.items.find((i) => i.id === voidItemId);
    expect(voidedItem?.voidedAt).not.toBeNull();
    expect(voidedItem?.voidReason).toBe('customer changed mind');
    expect(card?.items.filter((i) => i.isAddition)).toHaveLength(1);
  });

  it('not_ready puts the item back to pending (placed) or preparing (preparing)', async () => {
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
    const itemId = (created.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
    let version = (created.body as { version: number }).version;
    const kitchen = await asDemoKitchen(apiAgent(app));
    const itemUrl = `/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/status`;
    type Detail = { version: number; items: Array<{ id: string; status: string }> };
    const statusOf = (b: unknown) => (b as Detail).items.find((i) => i.id === itemId)?.status;

    let res = await kitchen.post(itemUrl).send({ to: 'ready', expectedVersion: version });
    expect(statusOf(res.body)).toBe('ready');
    version = (res.body as Detail).version;
    res = await kitchen.post(itemUrl).send({ to: 'not_ready', expectedVersion: version });
    expect(res.status).toBe(201);
    expect(statusOf(res.body)).toBe('pending');
    version = (res.body as Detail).version;

    const moved = await kitchen
      .post(`/v1/branches/${branchId}/orders/${orderId}/status`)
      .send({ to: 'preparing', expectedVersion: version });
    version = (moved.body as Detail).version;
    res = await kitchen.post(itemUrl).send({ to: 'ready', expectedVersion: version });
    version = (res.body as Detail).version;
    res = await kitchen.post(itemUrl).send({ to: 'not_ready', expectedVersion: version });
    expect(statusOf(res.body)).toBe('preparing');
  });
});
