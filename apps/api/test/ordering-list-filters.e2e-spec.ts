import { type INestApplication } from '@nestjs/common';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';

import {
  asDemoOwner,
  asOtherOwner,
} from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { newUuidV7 } from '../src/lib/uuid';

import {
  createIsolatedBranch,
  demoOwnerContext,
  insertCapturedPaymentRow,
  insertReportOrder,
} from './ordering-helpers';

describe('Ordering list filters (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('filters dateFrom/dateTo inclusive across two business dates', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { ctx } = await demoOwnerContext(apiAgent(app), db);
    const dayA = '2026-05-10';
    const dayB = '2026-05-11';
    await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: dayA,
      orderNumber: 1,
      createdByMembershipId: ctx.membershipId,
      status: 'completed',
    });
    await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: dayB,
      orderNumber: 2,
      createdByMembershipId: ctx.membershipId,
      status: 'completed',
    });
    await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: '2026-05-09',
      orderNumber: 3,
      createdByMembershipId: ctx.membershipId,
      status: 'completed',
    });

    const res = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: dayA,
      dateTo: dayB,
      limit: 50,
    });
    expect(res.status).toBe(200);
    const items = (res.body as { items: Array<{ businessDate: string }> }).items;
    expect(items).toHaveLength(2);
    const dates = new Set(items.map((i) => i.businessDate));
    expect(dates.has(dayA)).toBe(true);
    expect(dates.has(dayB)).toBe(true);
  });

  it('400 for invalid calendar dateFrom', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const res = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: '2026-02-30',
      dateTo: '2026-03-01',
    });
    expect(res.status).toBe(400);
  });

  it('400 when dateFrom is after dateTo', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const res = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: '2026-06-02',
      dateTo: '2026-06-01',
    });
    expect(res.status).toBe(400);
  });

  it('400 when date range exceeds 92 inclusive days', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const res = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: '2026-01-01',
      dateTo: '2026-04-05',
    });
    expect(res.status).toBe(400);
  });

  it('filters by type and paymentMethod without duplicate rows for multi-method orders', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { ctx } = await demoOwnerContext(apiAgent(app), db);
    const day = '2026-07-01';
    const cashOnlyId = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: day,
      orderNumber: 10,
      createdByMembershipId: ctx.membershipId,
      status: 'completed',
      type: 'takeaway',
    });
    await insertCapturedPaymentRow(db, {
      orgId: ctx.orgId,
      orderId: cashOnlyId,
      createdByMembershipId: ctx.membershipId,
      method: 'cash',
      amountMinor: 2500,
    });
    const cardId = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: day,
      orderNumber: 11,
      createdByMembershipId: ctx.membershipId,
      status: 'completed',
      type: 'dine_in',
    });
    await insertCapturedPaymentRow(db, {
      orgId: ctx.orgId,
      orderId: cardId,
      createdByMembershipId: ctx.membershipId,
      method: 'card',
      amountMinor: 2500,
    });
    const bothId = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: day,
      orderNumber: 12,
      createdByMembershipId: ctx.membershipId,
      status: 'completed',
    });
    await insertCapturedPaymentRow(db, {
      orgId: ctx.orgId,
      orderId: bothId,
      createdByMembershipId: ctx.membershipId,
      method: 'cash',
      amountMinor: 1000,
    });
    await insertCapturedPaymentRow(db, {
      orgId: ctx.orgId,
      orderId: bothId,
      createdByMembershipId: ctx.membershipId,
      method: 'card',
      amountMinor: 1500,
    });

    const byCard = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: day,
      dateTo: day,
      paymentMethod: 'card',
      limit: 50,
    });
    expect(byCard.status).toBe(200);
    const cardItems = (byCard.body as { items: Array<{ id: string }> }).items;
    expect(cardItems.some((i) => i.id === cardId)).toBe(true);
    expect(cardItems.some((i) => i.id === bothId)).toBe(true);
    expect(cardItems.some((i) => i.id === cashOnlyId)).toBe(false);
    expect(cardItems.filter((i) => i.id === bothId)).toHaveLength(1);

    const byType = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: day,
      dateTo: day,
      type: 'dine_in',
      limit: 50,
    });
    expect(byType.status).toBe(200);
    const typeItems = (byType.body as { items: Array<{ id: string }> }).items;
    expect(typeItems.map((i) => i.id)).toEqual([cardId]);

    const list = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: day,
      dateTo: day,
      limit: 50,
    });
    const both = (list.body as { items: Array<{ id: string; paymentMethods: string[] }> }).items.find(
      (i) => i.id === bothId,
    );
    expect(both?.paymentMethods).toEqual(['cash', 'card']);
  });

  it('combines q and cursor without duplicates across pages', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { ctx } = await demoOwnerContext(apiAgent(app), db);
    const day = '2026-08-15';
    const customer = `FilterCust-${newUuidV7().slice(-8)}`;
    for (let n = 1; n <= 12; n += 1) {
      await insertReportOrder(db, {
        orgId: ctx.orgId,
        branchId,
        businessDate: day,
        orderNumber: 100 + n,
        createdByMembershipId: ctx.membershipId,
        status: 'completed',
        customerName: customer,
      });
    }

    const page1 = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: day,
      dateTo: day,
      q: customer,
      limit: 5,
    });
    expect(page1.status).toBe(200);
    const body1 = page1.body as { items: Array<{ id: string }>; nextCursor: string | null };
    expect(body1.items).toHaveLength(5);
    expect(body1.nextCursor).not.toBeNull();

    const page2 = await owner.get(`/v1/branches/${branchId}/orders`).query({
      dateFrom: day,
      dateTo: day,
      q: customer,
      limit: 5,
      cursor: body1.nextCursor ?? undefined,
    });
    const body2 = page2.body as { items: Array<{ id: string }> };
    expect(body2.items.length).toBeGreaterThan(0);
    const ids1 = new Set(body1.items.map((i) => i.id));
    for (const row of body2.items) {
      expect(ids1.has(row.id)).toBe(false);
    }
  });

  it('404 for other org branch on list', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const other = await asOtherOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const res = await other.get(`/v1/branches/${branchId}/orders`);
    expect([403, 404]).toContain(res.status);
  });
});
