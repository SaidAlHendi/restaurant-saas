import { type INestApplication } from '@nestjs/common';
import { Test as NestTest, type TestingModule } from '@nestjs/testing';
import type { Agent } from 'supertest';

import { AppModule } from '../src/app.module';
import { ReportingService } from '../src/modules/reporting/reporting.service';
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
import { apiAgent, withBranch } from './http';
import {
  createIsolatedBranch,
  demoOwnerContext,
  insertCapturedPaymentRow,
  insertReportOrder,
  insertReportOrderItem,
  seedCatalogProduct,
} from './ordering-helpers';

class FixedClock implements Clock {
  constructor(private fixed: Date) {}

  now(): Date {
    return this.fixed;
  }
}

function addCalendarDays(businessDate: string, deltaDays: number): string {
  const parsed = Date.parse(`${businessDate}T00:00:00.000Z`);
  const next = new Date(parsed + deltaDays * 86_400_000);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${String(y)}-${m}-${d}`;
}

function isolatedBusinessDate(): string {
  const offset = Number.parseInt(newUuidV7().slice(-4), 16) % 300;
  return addCalendarDays('2032-01-01', offset);
}

describe('Reporting daily (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;
  const extraModules: TestingModule[] = [];

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await Promise.all(extraModules.map((m) => m.close()));
    await app.close();
  });

  it('returns 400 for invalid businessDate query', async () => {
    const owner = await asDemoOwner(agent);
    const { branchId } = await createIsolatedBranch(owner);
    const scoped = withBranch(owner, branchId);
    const res = await scoped.get(
      `/v1/branches/${branchId}/reports/daily?businessDate=2026-13-01`,
    );
    expect(res.status).toBe(400);
  });

  it('zero orders returns zeros with all types and payment methods', async () => {
    const owner = await asDemoOwner(agent);
    const { branchId } = await createIsolatedBranch(owner);
    const day = '2099-01-15';
    const res = await withBranch(owner, branchId)
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
    const owner = await asDemoOwner(agent);
    const { branchId } = await createIsolatedBranch(owner);
    const { ctx } = await demoOwnerContext(agent, db);
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

    const res = await withBranch(owner, branchId)
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
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const { ctx } = await demoOwnerContext(owner, db);
    const expectedToday = computeBusinessDate({
      now: fixedNow,
      timezone: 'Asia/Riyadh',
      dayStartHour: 4,
    });

    const clock = new FixedClock(fixedNow);
    const moduleRef = await NestTest.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();
    extraModules.push(moduleRef);
    const reporting = moduleRef.get(ReportingService);

    const defaultReport = await reporting.getDailyReport(ctx, branchId, {});
    expect(defaultReport.businessDate).toBe(expectedToday);

    const yesterday = '2100-06-14';
    await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate: yesterday,
      orderNumber: 7,
      createdByMembershipId: ctx.membershipId,
      status: 'completed',
      totalMinor: 3000,
    });
    const yRes = await withBranch(owner, branchId)
      .get(`/v1/branches/${branchId}/reports/daily`)
      .query({ businessDate: yesterday });
    expect(yRes.status).toBe(200);
    expect((yRes.body as { ordersCount: number; salesMinor: number }).ordersCount).toBe(1);
    expect((yRes.body as { salesMinor: number }).salesMinor).toBe(3000);
  });

  it('403 for cashier and kitchen, 200 for manager', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const cashier = withBranch(await asDemoCashier(apiAgent(app)), branchId);
    const kitchen = withBranch(await asDemoKitchen(apiAgent(app)), branchId);
    const manager = withBranch(await asDemoManager(apiAgent(app)), branchId);

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

  it('excludes draft and cancelled order items from sales and top items', async () => {
    const owner = await asDemoOwner(agent);
    const { branchId } = await createIsolatedBranch(owner);
    const { ctx } = await demoOwnerContext(agent, db);
    const membershipId = ctx.membershipId;
    const { productId } = await seedCatalogProduct(agent);
    const businessDate = isolatedBusinessDate();
    const orderBase = Number.parseInt(newUuidV7().slice(-6), 16) % 900_000;

    const completedId = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate,
      orderNumber: orderBase + 1,
      createdByMembershipId: membershipId,
      status: 'completed',
      totalMinor: 5000,
    });
    await insertReportOrderItem(db, {
      orgId: ctx.orgId,
      orderId: completedId,
      productId,
      quantity: 2,
      lineTotalMinor: 5000,
      productNameSnapshot: { en: 'Counted burger', ar: 'برجر' },
    });

    const draftId = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate,
      orderNumber: orderBase + 2,
      createdByMembershipId: membershipId,
      status: 'draft',
      totalMinor: 999_000,
    });
    await insertReportOrderItem(db, {
      orgId: ctx.orgId,
      orderId: draftId,
      productId,
      quantity: 500,
      lineTotalMinor: 999_000,
      productNameSnapshot: { en: 'Draft noise', ar: 'مسودة' },
    });

    const cancelledId = await insertReportOrder(db, {
      orgId: ctx.orgId,
      branchId,
      businessDate,
      orderNumber: orderBase + 3,
      createdByMembershipId: membershipId,
      status: 'cancelled',
      totalMinor: 888_000,
    });
    await insertReportOrderItem(db, {
      orgId: ctx.orgId,
      orderId: cancelledId,
      productId,
      quantity: 400,
      lineTotalMinor: 888_000,
      productNameSnapshot: { en: 'Cancelled noise', ar: 'ملغى' },
    });

    const res = await withBranch(owner, branchId).get(
      `/v1/branches/${branchId}/reports/daily?businessDate=${businessDate}`,
    );
    expect(res.status).toBe(200);
    const body = res.body as {
      salesMinor: number;
      topItems: Array<{ quantity: number; nameSnapshot: Record<string, string> }>;
    };
    expect(body.salesMinor).toBe(5000);
    expect(body.topItems.some((row) => row.nameSnapshot.en === 'Draft noise')).toBe(false);
    expect(body.topItems.some((row) => row.nameSnapshot.en === 'Cancelled noise')).toBe(false);
    expect(body.topItems.some((row) => row.nameSnapshot.en === 'Counted burger')).toBe(true);
    const burger = body.topItems.find((row) => row.nameSnapshot.en === 'Counted burger');
    expect(burger?.quantity).toBe(2);
  });
});
