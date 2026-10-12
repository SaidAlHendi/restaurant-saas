import { type INestApplication } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { CLOCK, type Clock } from '../src/core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { computeBusinessDate } from '../src/lib/business-date';
import { newUuidV7 } from '../src/lib/uuid';

import {
  asDemoCashier,
  asDemoKitchen,
  asDemoManager,
  asDemoOwner,
  asOtherOwner,
} from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import {
  createIsolatedBranch,
  demoOwnerContext,
  insertCapturedPaymentRow,
  insertReportOrder,
  insertReportOrderItem,
} from './ordering-helpers';

class FixedClock implements Clock {
  constructor(private fixed: Date) {}

  now(): Date {
    return this.fixed;
  }
}

describe('Reporting daily (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('zero orders returns zeros with all types and payment methods', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const day = '2099-01-15';
    const res = await owner
      .get(`/v1/branches/${branchId}/reports/daily`)
      .query({ businessDate: day });
    expect(res.status).toBe(200);
    const body = res.body as {
      salesMinor: number;
      ordersCount: number;
      byType: Array<{ type: string; ordersCount: number }>;
      byPaymentMethod: Array<{ method: string; amountMinor: number }>;
      topItems: unknown[];
    };
    expect(body.salesMinor).toBe(0);
    expect(body.ordersCount).toBe(0);
    expect(body.byType).toHaveLength(2);
    expect(body.byPaymentMethod).toHaveLength(3);
    expect(body.byPaymentMethod.every((m) => m.amountMinor === 0)).toBe(true);
    expect(body.topItems).toHaveLength(0);
  });

  it('excludes draft/cancelled from sales, counts status buckets, partial pay, top items order', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { ctx } = await demoOwnerContext(apiAgent(app), db);
    const day = '2099-02-20';
    const membershipId = ctx.membershipId;

    await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: day,
      orderNumber: 1,
      createdByMembershipId: membershipId,
      status: 'draft',
      totalMinor: 9000,
    });
    await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: day,
      orderNumber: 2,
      createdByMembershipId: membershipId,
      status: 'cancelled',
      totalMinor: 8000,
    });

    const counted1 = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: day,
      orderNumber: 3,
      createdByMembershipId: membershipId,
      status: 'completed',
      totalMinor: 1000,
      taxMinor: 100,
    });
    const counted2 = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: day,
      orderNumber: 4,
      createdByMembershipId: membershipId,
      status: 'placed',
      totalMinor: 2000,
      taxMinor: 200,
    });
    await insertCapturedPaymentRow(db, {
      orgId: ctx.orgId,
      orderId: counted2,
      createdByMembershipId: membershipId,
      method: 'cash',
      amountMinor: 500,
    });
    await insertCapturedPaymentRow(db, {
      orgId: ctx.orgId,
      orderId: counted1,
      createdByMembershipId: membershipId,
      method: 'card',
      amountMinor: 1000,
    });

    const pA = newUuidV7();
    const pB = newUuidV7();
    const pC = newUuidV7();
    const topOrder = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: day,
      orderNumber: 5,
      createdByMembershipId: membershipId,
      status: 'completed',
      totalMinor: 5000,
    });
    await insertReportOrderItem(db, {
      orgId: ctx.orgId,
      orderId: topOrder,
      productId: pA,
      quantity: 5,
      lineTotalMinor: 500,
      productNameSnapshot: { en: 'Prod A', ar: 'أ' },
    });
    await insertReportOrderItem(db, {
      orgId: ctx.orgId,
      orderId: topOrder,
      productId: pB,
      quantity: 5,
      lineTotalMinor: 800,
      productNameSnapshot: { en: 'Prod B', ar: 'ب' },
    });
    await insertReportOrderItem(db, {
      orgId: ctx.orgId,
      orderId: topOrder,
      productId: pC,
      quantity: 2,
      lineTotalMinor: 200,
      productNameSnapshot: { en: 'Prod C', ar: 'ج' },
    });
    await insertReportOrderItem(db, {
      orgId: ctx.orgId,
      orderId: topOrder,
      productId: newUuidV7(),
      quantity: 99,
      lineTotalMinor: 9900,
      status: 'voided',
    });

    const otherBranch = await createIsolatedBranch(owner);
    await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId: otherBranch.branchId,
      businessDate: day,
      orderNumber: 99,
      createdByMembershipId: membershipId,
      status: 'completed',
      totalMinor: 50_000,
    });

    const res = await owner
      .get(`/v1/branches/${branchId}/reports/daily`)
      .query({ businessDate: day });
    expect(res.status).toBe(200);
    const body = res.body as {
      salesMinor: number;
      taxMinor: number;
      ordersCount: number;
      averageTicketMinor: number;
      paidMinor: number;
      unpaidMinor: number;
      cancelledCount: number;
      draftCount: number;
      byPaymentMethod: Array<{ method: string; amountMinor: number }>;
      topItems: Array<{ productId: string; quantity: number; revenueMinor: number }>;
    };

    expect(body.ordersCount).toBe(3);
    expect(body.salesMinor).toBe(1000 + 2000 + 5000);
    expect(body.taxMinor).toBe(100 + 200);
    expect(body.draftCount).toBe(1);
    expect(body.cancelledCount).toBe(1);
    expect(body.averageTicketMinor).toBe(Math.round(body.salesMinor / 3));
    expect(body.paidMinor).toBe(1500);
    expect(body.unpaidMinor).toBe(body.salesMinor - body.paidMinor);
    const methodSum = body.byPaymentMethod.reduce((s, r) => s + r.amountMinor, 0);
    expect(methodSum).toBe(body.paidMinor);

    expect(body.topItems.length).toBeLessThanOrEqual(10);
    expect(body.topItems[0]?.productId).toBe(pB);
    expect(body.topItems[1]?.productId).toBe(pA);
    expect(body.topItems[2]?.productId).toBe(pC);
  });

  it('defaults businessDate from branch clock and accepts explicit yesterday', async () => {
    const fixedNow = new Date('2100-06-15T10:00:00.000Z');
    const clock = new FixedClock(fixedNow);
    const moduleRef = await NestTest.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();
    const clockApp = moduleRef.createNestApplication();
    await clockApp.init();
    const clockDb: DrizzleDb = clockApp.get(DRIZZLE);

    try {
      const owner = await asDemoOwner(apiAgent(clockApp));
      const { branchId } = await createIsolatedBranch(owner);
      const { ctx } = await demoOwnerContext(apiAgent(clockApp), clockDb);
      const expectedToday = computeBusinessDate({
        now: fixedNow,
        timezone: 'Asia/Riyadh',
        dayStartHour: 4,
      });

      const defaultRes = await owner.get(`/v1/branches/${branchId}/reports/daily`);
      expect(defaultRes.status).toBe(200);
      expect((defaultRes.body as { businessDate: string }).businessDate).toBe(expectedToday);

      const yesterday = '2100-06-14';
      await insertReportOrder(clockDb, {
        orgId: ctx.orgId,
        branchId,
        businessDate: yesterday,
        orderNumber: 7,
        createdByMembershipId: ctx.membershipId,
        status: 'completed',
        totalMinor: 3000,
      });
      const yRes = await owner
        .get(`/v1/branches/${branchId}/reports/daily`)
        .query({ businessDate: yesterday });
      expect(yRes.status).toBe(200);
      expect((yRes.body as { ordersCount: number; salesMinor: number }).ordersCount).toBe(1);
      expect((yRes.body as { salesMinor: number }).salesMinor).toBe(3000);
    } finally {
      await clockApp.close();
    }
  });

  it('403 for cashier and kitchen, 200 for manager', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const cashier = await asDemoCashier(apiAgent(app));
    const kitchen = await asDemoKitchen(apiAgent(app));
    const manager = await asDemoManager(apiAgent(app));

    expect((await cashier.get(`/v1/branches/${branchId}/reports/daily`)).status).toBe(403);
    expect((await kitchen.get(`/v1/branches/${branchId}/reports/daily`)).status).toBe(403);
    expect((await manager.get(`/v1/branches/${branchId}/reports/daily`)).status).toBe(200);
  });

  it('404/403 for other org branch', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const other = await asOtherOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const res = await other.get(`/v1/branches/${branchId}/reports/daily`);
    expect([403, 404]).toContain(res.status);
  });
});
