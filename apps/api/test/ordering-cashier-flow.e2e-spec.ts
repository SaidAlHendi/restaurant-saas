import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { newUuidV7 } from '../src/lib/uuid';

import { asDemoCashier, asDemoOwner, asOtherOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import {
  businessDateForBranch,
  createIsolatedBranch,
  demoOwnerContext,
  insertDiningTable,
  insertPlacedOrderForBusinessDate,
  lastOutboxChangeForOrder,
  listOrderEventTypes,
  postOrder,
  postPayment,
  seedCatalogProduct,
} from './ordering-helpers';
import { SEED_ORG } from './factories';

describe('Cashier flow (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  async function draftOrderOnBranch(owner: Agent, branchId: string, productId: string) {
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
    return created;
  }

  it('creates draft when payBeforeSend and totalMinor > 0', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    expect(created.status).toBe(201);
    expect((created.body as { status: string }).status).toBe('draft');
    expect((created.body as { placedAt: string | null }).placedAt).toBeNull();
  });

  it('creates placed and paid when totalMinor is 0 even if payBeforeSend', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    await owner.patch(`/v1/products/${productId}`).send({ priceMinor: 0 });
    const created = await draftOrderOnBranch(owner, branchId, productId);
    expect(created.status).toBe(201);
    const body = created.body as { status: string; paymentStatus: string; placedAt: string | null };
    expect(body.status).toBe('placed');
    expect(body.paymentStatus).toBe('paid');
    expect(body.placedAt).not.toBeNull();
  });

  it('full payment on draft places order', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number; totalMinor: number; dueMinor: number };
    const clientPaymentId = newUuidV7();
    const paid = await postPayment(
      owner,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order.version,
        method: 'cash',
        amountMinor: order.dueMinor,
        tenderedMinor: order.dueMinor,
      },
      clientPaymentId,
    );
    expect(paid.status).toBe(201);
    const detail = await owner.get(`/v1/branches/${branchId}/orders/${order.id}`);
    expect(detail.status).toBe(200);
    const after = detail.body as { status: string; placedAt: string | null };
    expect(after.status).toBe('placed');
    expect(after.placedAt).not.toBeNull();
  });

  it('partial payment leaves draft', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number; totalMinor: number };
    const clientPaymentId = newUuidV7();
    const partial = Math.max(1, Math.floor(order.totalMinor / 4));
    const paid = await postPayment(
      owner,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order.version,
        method: 'cash',
        amountMinor: partial,
        tenderedMinor: partial,
      },
      clientPaymentId,
    );
    expect(paid.status).toBe(201);
    const detail = await owner.get(`/v1/branches/${branchId}/orders/${order.id}`);
    const after = detail.body as { status: string; paymentStatus: string };
    expect(after.status).toBe('draft');
    expect(after.paymentStatus).toBe('partial');
  });

  it('cancel draft without payments', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number };
    const cancelled = await owner.post(`/v1/branches/${branchId}/orders/${order.id}/status`).send({
      to: 'cancelled',
      expectedVersion: order.version,
      reason: 'Customer left',
    });
    expect(cancelled.status).toBe(201);
    expect((cancelled.body as { status: string }).status).toBe('cancelled');
  });

  it('POST status draft to placed returns ORDER_INVALID_TRANSITION', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number };
    const res = await owner.post(`/v1/branches/${branchId}/orders/${order.id}/status`).send({
      to: 'placed',
      expectedVersion: order.version,
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('ORDER_INVALID_TRANSITION');
  });

  it('capture card when acceptsCard false returns PAYMENT_METHOD_NOT_ACCEPTED', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false, acceptsCard: false });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number; dueMinor: number };
    const clientPaymentId = newUuidV7();
    const res = await postPayment(
      owner,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order.version,
        method: 'card',
        amountMinor: order.dueMinor,
      },
      clientPaymentId,
    );
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('PAYMENT_METHOD_NOT_ACCEPTED');
  });

  it('PATCH branch settings as cashier returns 403 and as owner returns 200', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const cashier = await asDemoCashier(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const denied = await cashier.patch(`/v1/branches/${branchId}`).send({ payBeforeSend: true });
    expect(denied.status).toBe(403);
    const ok = await owner.patch(`/v1/branches/${branchId}`).send({ payBeforeSend: true });
    expect(ok.status).toBe(200);
    expect((ok.body as { payBeforeSend: boolean }).payBeforeSend).toBe(true);
  });

  it('GET pos menu returns payBeforeSend and acceptsCard', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, {
      payBeforeSend: true,
      acceptsCard: false,
    });
    const menu = await owner.get(`/v1/branches/${branchId}/pos/menu`);
    expect(menu.status).toBe(200);
    const branch = (menu.body as { branch: { payBeforeSend: boolean; acceptsCard: boolean } }).branch;
    expect(branch.payBeforeSend).toBe(true);
    expect(branch.acceptsCard).toBe(false);
  });

  it('addItems on draft updates totals and stays draft', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number; totalMinor: number };
    const added = await owner.post(`/v1/branches/${branchId}/orders/${order.id}/items`).send({
      expectedVersion: order.version,
      items: [{ productId, quantity: 2, modifierIds: [] }],
    });
    expect(added.status).toBe(201);
    const body = added.body as { status: string; totalMinor: number };
    expect(body.status).toBe('draft');
    expect(body.totalMinor).toBeGreaterThan(order.totalMinor);
  });

  it('list q with long digit string returns 200', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const list = await owner.get(`/v1/branches/${branchId}/orders?q=99999999999`);
    expect(list.status).toBe(200);
  });

  it('list q with percent in customer_name matches literally', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { productId } = await seedCatalogProduct(agent);
    const clientOrderId = newUuidV7();
    const suffix = newUuidV7().slice(-8);
    const label = `%pct-${suffix}%`;
    const created = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        customerName: label,
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(created.status).toBe(201);
    const list = await owner.get(
      `/v1/branches/${branchId}/orders?q=${encodeURIComponent(label)}`,
    );
    expect(list.status).toBe(200);
    const items = (list.body as { items: Array<{ customerName: string | null }> }).items;
    expect(items.some((row) => row.customerName === label)).toBe(true);
  });

  it('list activeOnly includes draft', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    await draftOrderOnBranch(owner, branchId, productId);
    const list = await owner.get(`/v1/branches/${branchId}/orders?activeOnly=true&limit=100`);
    expect(list.status).toBe(200);
    const items = (list.body as { items: Array<{ status: string }> }).items;
    expect(items.some((row) => row.status === 'draft')).toBe(true);
  });

  it('list cursor paging works with q', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { productId } = await seedCatalogProduct(agent);
    for (let i = 0; i < 3; i += 1) {
      const clientOrderId = newUuidV7();
      await postOrder(
        owner,
        branchId,
        {
          clientOrderId,
          type: 'takeaway',
          customerName: `Pager ${String(i)}`,
          items: [{ productId, quantity: 1, modifierIds: [] }],
        },
        clientOrderId,
      );
    }
    const first = await owner.get(`/v1/branches/${branchId}/orders?q=Pager&limit=1`);
    expect(first.status).toBe(200);
    const firstBody = first.body as { items: unknown[]; nextCursor: string | null };
    expect(firstBody.items.length).toBe(1);
    expect(firstBody.nextCursor).not.toBeNull();
    const second = await owner.get(
      `/v1/branches/${branchId}/orders?q=Pager&limit=1&cursor=${encodeURIComponent(firstBody.nextCursor ?? '')}`,
    );
    expect(second.status).toBe(200);
    expect((second.body as { items: unknown[] }).items.length).toBe(1);
  });

  it('list dine-in order includes tableLabel', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { productId } = await seedCatalogProduct(agent);
    const tableId = await insertDiningTable(db, SEED_ORG.demo.id, branchId, `T-${newUuidV7().slice(-6)}`);
    const clientOrderId = newUuidV7();
    const created = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'dine_in',
        tableId,
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(created.status).toBe(201);
    const list = await owner.get(`/v1/branches/${branchId}/orders?limit=20`);
    expect(list.status).toBe(200);
    const orderId = (created.body as { id: string }).id;
    const row = (list.body as { items: Array<{ id: string; tableLabel: string | null }> }).items.find(
      (item) => item.id === orderId,
    );
    expect(row?.tableLabel).toBeTruthy();
  });

  it('draft order is not on GET kitchen board', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const orderId = (created.body as { id: string }).id;
    const board = await owner.get(`/v1/branches/${branchId}/kitchen/board`);
    expect(board.status).toBe(200);
    const ids = (board.body as { orders: Array<{ id: string }> }).orders.map((o) => o.id);
    expect(ids).not.toContain(orderId);
  });

  it('full payment on draft bumps version by 1 and writes events in order', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number; dueMinor: number };
    expect(order.version).toBe(1);
    const clientPaymentId = newUuidV7();
    const paid = await postPayment(
      owner,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order.version,
        method: 'cash',
        amountMinor: order.dueMinor,
        tenderedMinor: order.dueMinor,
      },
      clientPaymentId,
    );
    expect(paid.status).toBe(201);
    const detail = await owner.get(`/v1/branches/${branchId}/orders/${order.id}`);
    expect((detail.body as { version: number }).version).toBe(2);
    const types = await listOrderEventTypes(db, SEED_ORG.demo.id, order.id);
    expect(types).toEqual(['order.drafted', 'payment.captured', 'order.placed']);
    const change = await lastOutboxChangeForOrder(SEED_ORG.demo.id, order.id);
    expect(change).toBe('placed');
  });

  it('cancel draft with partial payment returns 422 ORDER_HAS_PAYMENTS', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number; totalMinor: number };
    const clientPaymentId = newUuidV7();
    const partial = Math.max(1, Math.floor(order.totalMinor / 4));
    const paid = await postPayment(
      owner,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order.version,
        method: 'cash',
        amountMinor: partial,
        tenderedMinor: partial,
      },
      clientPaymentId,
    );
    expect(paid.status).toBe(201);
    const afterPay = await owner.get(`/v1/branches/${branchId}/orders/${order.id}`);
    const version = (afterPay.body as { version: number }).version;
    const cancelled = await owner.post(`/v1/branches/${branchId}/orders/${order.id}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'Changed mind',
    });
    expect(cancelled.status).toBe(422);
    expect((cancelled.body as { error: { code: string } }).error.code).toBe('ORDER_HAS_PAYMENTS');
  });

  it('replaying captured clientPaymentId returns 200 after acceptsCard is turned off', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner, { payBeforeSend: false, acceptsCard: true });
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const order = created.body as { id: string; version: number; dueMinor: number };
    const clientPaymentId = newUuidV7();
    const first = await postPayment(
      owner,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order.version,
        method: 'card',
        amountMinor: order.dueMinor,
      },
      clientPaymentId,
    );
    expect(first.status).toBe(201);
    const patch = await owner.patch(`/v1/branches/${branchId}`).send({ acceptsCard: false });
    expect(patch.status).toBe(200);
    const replay = await postPayment(
      owner,
      branchId,
      order.id,
      {
        clientPaymentId,
        expectedVersion: order.version,
        method: 'card',
        amountMinor: order.dueMinor,
      },
      clientPaymentId,
    );
    expect(replay.status).toBe(200);
  });

  it('list q matches order number', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const orderNumber = (created.body as { orderNumber: number }).orderNumber;
    const list = await owner.get(`/v1/branches/${branchId}/orders?q=${String(orderNumber)}`);
    expect(list.status).toBe(200);
    const items = (list.body as { items: Array<{ orderNumber: number }> }).items;
    expect(items.some((row) => row.orderNumber === orderNumber)).toBe(true);
  });

  it('list todayOnly excludes order with yesterday business_date', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const yesterday = businessDateForBranch('Asia/Riyadh', 4, new Date(Date.now() - 86_400_000));
    const orderNumber = 8000 + Math.floor(Math.random() * 1000);
    const oldId = await insertPlacedOrderForBusinessDate(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: yesterday,
      orderNumber,
      createdByMembershipId: ctx.membershipId,
    });
    const list = await owner.get(`/v1/branches/${branchId}/orders?todayOnly=true&limit=100`);
    expect(list.status).toBe(200);
    const ids = (list.body as { items: Array<{ id: string }> }).items.map((row) => row.id);
    expect(ids).not.toContain(oldId);
  });

  it('other org gets 404 on branch orders list and PATCH', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const other = await asOtherOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { productId } = await seedCatalogProduct(agent);
    const created = await draftOrderOnBranch(owner, branchId, productId);
    const orderId = (created.body as { id: string }).id;
    const list = await other.get(`/v1/branches/${branchId}/orders`);
    expect(list.status).toBe(404);
    const patch = await other.patch(`/v1/branches/${branchId}`).send({ payBeforeSend: false });
    expect(patch.status).toBe(404);
    expect(orderId.length).toBeGreaterThan(0);
  });
});
