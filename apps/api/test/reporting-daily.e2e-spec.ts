import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { SEED_ORG } from './factories';
import { apiAgent, withBranch } from './http';
import {
  demoOwnerContext,
  insertReportOrder,
  insertReportOrderItem,
  seedCatalogProduct,
} from './ordering-helpers';

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
  let branchId = '';
  let productId = '';
  let membershipId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    db = app.get(DRIZZLE);
    const ctx = await demoOwnerContext(agent, db);
    branchId = ctx.branchId;
    membershipId = ctx.ctx.membershipId;
    ({ productId } = await seedCatalogProduct(agent));
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 for invalid businessDate query', async () => {
    const owner = withBranch(await asDemoOwner(agent), branchId);
    const res = await owner.get(
      `/v1/branches/${branchId}/reports/daily?businessDate=2026-13-01`,
    );
    expect(res.status).toBe(400);
  });

  it('excludes draft and cancelled order items from sales and top items', async () => {
    const businessDate = isolatedBusinessDate();
    const orderBase = Number.parseInt(newUuidV7().slice(-6), 16) % 900_000;

    const completedId = await insertReportOrder(db, {
      orgId: SEED_ORG.demo.id,
      branchId,
      businessDate,
      orderNumber: orderBase + 1,
      createdByMembershipId: membershipId,
      status: 'completed',
      totalMinor: 5000,
    });
    await insertReportOrderItem(db, {
      orgId: SEED_ORG.demo.id,
      orderId: completedId,
      productId,
      quantity: 2,
      lineTotalMinor: 5000,
      productNameSnapshot: { en: 'Counted burger', ar: 'برجر' },
    });

    const draftId = await insertReportOrder(db, {
      orgId: SEED_ORG.demo.id,
      branchId,
      businessDate,
      orderNumber: orderBase + 2,
      createdByMembershipId: membershipId,
      status: 'draft',
      totalMinor: 999_000,
    });
    await insertReportOrderItem(db, {
      orgId: SEED_ORG.demo.id,
      orderId: draftId,
      productId,
      quantity: 500,
      lineTotalMinor: 999_000,
      productNameSnapshot: { en: 'Draft noise', ar: 'مسودة' },
    });

    const cancelledId = await insertReportOrder(db, {
      orgId: SEED_ORG.demo.id,
      branchId,
      businessDate,
      orderNumber: orderBase + 3,
      createdByMembershipId: membershipId,
      status: 'cancelled',
      totalMinor: 888_000,
    });
    await insertReportOrderItem(db, {
      orgId: SEED_ORG.demo.id,
      orderId: cancelledId,
      productId,
      quantity: 400,
      lineTotalMinor: 888_000,
      productNameSnapshot: { en: 'Cancelled noise', ar: 'ملغى' },
    });

    const owner = withBranch(await asDemoOwner(agent), branchId);
    const res = await owner.get(
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
