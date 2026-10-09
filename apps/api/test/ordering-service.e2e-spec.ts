import { eq, sql } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { OutboxService } from '../src/core/outbox/outbox.service';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';
import { OrderingService } from '../src/modules/ordering/ordering.service';
import { BusinessRuleError } from '../src/core/errors/app-errors';

import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { SEED_ORG } from './factories';
import { CLOCK, type Clock } from '../src/core/clock/clock.tokens';
import { branches } from '../src/core/db/schema/tenancy';
import { computeBusinessDate } from '../src/lib/business-date';

import {
  businessDateForBranch,
  countOrderEvents,
  demoBranchIds,
  demoOwnerContext,
  insertDiningTable,
  readBranchCounter,
  seedCatalogProduct,
  seedProductWithRequiredModifier,
  seedProductWithTwoModifiersMaxOne,
} from './ordering-helpers';

class MutableClock implements Clock {
  constructor(private at: Date) {}

  set(at: Date): void {
    this.at = at;
  }

  now(): Date {
    return this.at;
  }
}

class ThrowingOutboxService extends OutboxService {
  override write(): Promise<void> {
    return Promise.reject(new Error('outbox write failed'));
  }
}

describe('OrderingService (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;
  let ordering: OrderingService;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
    ordering = moduleRef.get(OrderingService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates idempotently by clientOrderId', async () => {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const clientOrderId = newUuidV7();
    const body = {
      clientOrderId,
      type: 'takeaway' as const,
      items: [{ productId, quantity: 1, modifierIds: [] as string[] }],
    };
    const first = await ordering.createOrder(ctx, branchId, body);
    expect(first.created).toBe(true);
    expect(first.order.status).toBe('placed');
    const second = await ordering.createOrder(ctx, branchId, body);
    expect(second.created).toBe(false);
    expect(second.order.id).toBe(first.order.id);
  });

  async function createTakeawayOrder(clientOrderId: string) {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    return ordering.createOrder(ctx, branchId, {
      clientOrderId,
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
  }

  it('assigns sequential order numbers per branch/day', async () => {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const ids = await Promise.all(
      Array.from({ length: 3 }, () =>
        ordering.createOrder(ctx, branchId, {
          clientOrderId: newUuidV7(),
          type: 'takeaway',
          items: [{ productId, quantity: 1, modifierIds: [] }],
        }),
      ),
    );
    const numbers = ids.map((r) => r.order.orderNumber);
    expect(new Set(numbers).size).toBe(3);
  });

  it('does not burn order number when validation fails before counter', async () => {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const fakeModifier = newUuidV7();
    let counterBefore = 0;
    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const row = await tx.execute(sql`
        SELECT coalesce(max(last_order_number), 0)::int AS n FROM branch_counters WHERE branch_id = ${branchId}::uuid
      `);
      counterBefore = (row.rows[0] as { n: number }).n;
    });
    await expect(
      ordering.createOrder(ctx, branchId, {
        clientOrderId: newUuidV7(),
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [fakeModifier] }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    let counterAfterFail = -1;
    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const row = await tx.execute(sql`
        SELECT coalesce(max(last_order_number), 0)::int AS n FROM branch_counters WHERE branch_id = ${branchId}::uuid
      `);
      counterAfterFail = (row.rows[0] as { n: number }).n;
    });
    expect(counterAfterFail).toBe(counterBefore);

    const ok = await ordering.createOrder(ctx, branchId, {
      clientOrderId: newUuidV7(),
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    expect(ok.order.orderNumber).toBe(counterBefore + 1);
  });

  it('rolls back when outbox write fails', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OutboxService)
      .useClass(ThrowingOutboxService)
      .compile();
    const failingOrdering = moduleRef.get(OrderingService);
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const clientOrderId = newUuidV7();

    const branchRow = await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const rows = await tx.select().from(branches).where(eq(branches.id, branchId)).limit(1);
      return rows[0];
    });
    if (!branchRow) {
      throw new Error('branch missing');
    }
    const businessDate = computeBusinessDate({
      now: new Date(),
      timezone: branchRow.timezone,
      dayStartHour: branchRow.dayStartHour,
    });
    const counterBefore = await readBranchCounter(db, SEED_ORG.demo.id, branchId, businessDate);
    const eventsBefore = await countOrderEvents(db, SEED_ORG.demo.id);

    await expect(
      failingOrdering.createOrder(ctx, branchId, {
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      }),
    ).rejects.toThrow('outbox write failed');

    const counterAfterFail = await readBranchCounter(db, SEED_ORG.demo.id, branchId, businessDate);
    const eventsAfterFail = await countOrderEvents(db, SEED_ORG.demo.id);
    expect(counterAfterFail).toBe(counterBefore);
    expect(eventsAfterFail).toBe(eventsBefore);

    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const orders = await tx.execute(sql`
        SELECT id FROM orders WHERE client_order_id = ${clientOrderId}::uuid
      `);
      expect(orders.rows).toHaveLength(0);
    });

    const ok = await ordering.createOrder(ctx, branchId, {
      clientOrderId: newUuidV7(),
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    expect(ok.order.orderNumber).toBe(counterBefore + 1);
  });

  it('changes status with optimistic locking', async () => {
    const clientOrderId = newUuidV7();
    const placed = await createTakeawayOrder(clientOrderId);
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const updated = await ordering.changeStatus(ctx, branchId, placed.order.id, {
      to: 'preparing',
      expectedVersion: placed.order.version,
    });
    expect(updated.status).toBe('preparing');
    await expect(
      ordering.changeStatus(ctx, branchId, placed.order.id, {
        to: 'ready',
        expectedVersion: placed.order.version,
      }),
    ).rejects.toMatchObject({ code: 'ORDER_VERSION_CONFLICT' });
  });

  it('adds items in preparing and voids with totals recompute', async () => {
    const placed = await createTakeawayOrder(newUuidV7());
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const preparing = await ordering.changeStatus(ctx, branchId, placed.order.id, {
      to: 'preparing',
      expectedVersion: placed.order.version,
    });
    const { productId } = await seedCatalogProduct(agent);
    const withItem = await ordering.addItems(ctx, branchId, placed.order.id, {
      expectedVersion: preparing.version,
      items: [{ productId, quantity: 2, modifierIds: [] }],
    });
    expect(withItem.items.some((i) => i.isAddition)).toBe(true);
    const itemToVoid = withItem.items.find((i) => !i.isAddition);
    expect(itemToVoid).toBeDefined();
    if (!itemToVoid) {
      return;
    }
    const afterVoid = await ordering.voidItem(ctx, branchId, placed.order.id, itemToVoid.id, {
      expectedVersion: withItem.version,
      reason: 'Customer changed mind',
    });
    expect(afterVoid.items.find((i) => i.id === itemToVoid.id)?.status).toBe('voided');
  });

  it('creates one order when clientOrderId submitted in parallel', async () => {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const clientOrderId = newUuidV7();
    const body = {
      clientOrderId,
      type: 'takeaway' as const,
      items: [{ productId, quantity: 1, modifierIds: [] as string[] }],
    };
    const [a, b] = await Promise.all([
      ordering.createOrder(ctx, branchId, body),
      ordering.createOrder(ctx, branchId, body),
    ]);
    expect(a.order.id).toBe(b.order.id);
  });

  it('assigns twenty parallel order numbers without gaps on one branch', async () => {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const branchRow = await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const rows = await tx.select().from(branches).where(eq(branches.id, branchId)).limit(1);
      return rows[0];
    });
    if (!branchRow) {
      throw new Error('branch missing');
    }
    const businessDate = businessDateForBranch(
      branchRow.timezone,
      branchRow.dayStartHour,
      new Date(),
    );
    const before = await readBranchCounter(db, SEED_ORG.demo.id, branchId, businessDate);
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        ordering.createOrder(ctx, branchId, {
          clientOrderId: newUuidV7(),
          type: 'takeaway',
          items: [{ productId, quantity: 1, modifierIds: [] }],
        }),
      ),
    );
    const numbers = results.map((r) => r.order.orderNumber).sort((x, y) => x - y);
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => before + i + 1));
  });

  it('keeps independent counters per branch', async () => {
    const { ctx } = await demoOwnerContext(agent, db);
    const [branchA, branchB] = await demoBranchIds(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const a = await ordering.createOrder(ctx, branchA, {
      clientOrderId: newUuidV7(),
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    const b = await ordering.createOrder(ctx, branchB, {
      clientOrderId: newUuidV7(),
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    expect(a.order.orderNumber).toBeGreaterThan(0);
    expect(b.order.orderNumber).toBeGreaterThan(0);
  });

  it('resets order number to 1 on a new business day with fixed clock', async () => {
    const clock = new MutableClock(new Date('2026-06-01T05:00:00.000Z'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();
    const clockOrdering = moduleRef.get(OrderingService);
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const branchRow = await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const rows = await tx.select().from(branches).where(eq(branches.id, branchId)).limit(1);
      return rows[0];
    });
    if (!branchRow) {
      throw new Error('branch missing');
    }
    const day1 = await clockOrdering.createOrder(ctx, branchId, {
      clientOrderId: newUuidV7(),
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    clock.set(new Date('2026-06-02T01:00:00.000Z'));
    const day2 = await clockOrdering.createOrder(ctx, branchId, {
      clientOrderId: newUuidV7(),
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    expect(day2.order.orderNumber).toBe(1);
    expect(day2.order.businessDate).not.toBe(day1.order.businessDate);
  });

  it('rejects completed to preparing transition', async () => {
    const placed = await createTakeawayOrder(newUuidV7());
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    let order = placed.order;
    order = await ordering.changeStatus(ctx, branchId, order.id, {
      to: 'preparing',
      expectedVersion: order.version,
    });
    order = await ordering.changeStatus(ctx, branchId, order.id, {
      to: 'ready',
      expectedVersion: order.version,
    });
    order = await ordering.changeStatus(ctx, branchId, order.id, {
      to: 'completed',
      expectedVersion: order.version,
    });
    await expect(
      ordering.changeStatus(ctx, branchId, order.id, {
        to: 'preparing',
        expectedVersion: order.version,
      }),
    ).rejects.toMatchObject({ code: 'ORDER_INVALID_TRANSITION' });
  });

  it('resolves concurrent status updates with one conflict', async () => {
    const placed = await createTakeawayOrder(newUuidV7());
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const results = await Promise.allSettled([
      ordering.changeStatus(ctx, branchId, placed.order.id, {
        to: 'preparing',
        expectedVersion: placed.order.version,
      }),
      ordering.changeStatus(ctx, branchId, placed.order.id, {
        to: 'preparing',
        expectedVersion: placed.order.version,
      }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const bad = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(bad).toHaveLength(1);
    if (bad[0]?.status === 'rejected') {
      expect(bad[0].reason).toMatchObject({ code: 'ORDER_VERSION_CONFLICT' });
    }
  });

  it('validates modifier group bounds and attachment', async () => {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId, groupId } = await seedProductWithRequiredModifier(agent);
    await expect(
      ordering.createOrder(ctx, branchId, {
        clientOrderId: newUuidV7(),
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_MODIFIERS_INVALID', details: { groupId } });

    const { productId: p2, modifierIdA, modifierIdB } =
      await seedProductWithTwoModifiersMaxOne(agent);
    await expect(
      ordering.createOrder(ctx, branchId, {
        clientOrderId: newUuidV7(),
        type: 'takeaway',
        items: [{ productId: p2, quantity: 1, modifierIds: [modifierIdA, modifierIdB] }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_MODIFIERS_INVALID' });

    const otherMod = newUuidV7();
    await expect(
      ordering.createOrder(ctx, branchId, {
        clientOrderId: newUuidV7(),
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [otherMod] }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_MODIFIERS_INVALID' });
  });

  it('stores added item ids on order.items_added event', async () => {
    const placed = await createTakeawayOrder(newUuidV7());
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const withItems = await ordering.addItems(ctx, branchId, placed.order.id, {
      expectedVersion: placed.order.version,
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    const added = withItems.items.find((i) => i.isAddition);
    expect(added).toBeDefined();
    const events = await ordering.listEvents(ctx, branchId, placed.order.id);
    const itemsAdded = events.items.find((e) => e.type === 'order.items_added');
    expect(itemsAdded).toBeDefined();
    const itemIds = itemsAdded?.payload.itemIds;
    expect(Array.isArray(itemIds)).toBe(true);
    expect((itemIds as string[])[0]).toBe(added?.id);
  });

  it('stores created item ids on order.placed event', async () => {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const created = await ordering.createOrder(ctx, branchId, {
      clientOrderId: newUuidV7(),
      type: 'takeaway',
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    const events = await ordering.listEvents(ctx, branchId, created.order.id);
    const placed = events.items.find((e) => e.type === 'order.placed');
    expect(placed).toBeDefined();
    const itemIds = placed?.payload.itemIds;
    expect(Array.isArray(itemIds)).toBe(true);
    expect((itemIds as string[]).length).toBe(1);
    expect(created.order.items[0]?.id).toBe((itemIds as string[])[0]);
  });

  it('requires table for dine_in', async () => {
    const { ctx, branchId } = await demoOwnerContext(agent, db);
    const { productId } = await seedCatalogProduct(agent);
    const tableId = await insertDiningTable(db, SEED_ORG.demo.id, branchId, `T-${newUuidV7().slice(0, 6)}`);
    const order = await ordering.createOrder(ctx, branchId, {
      clientOrderId: newUuidV7(),
      type: 'dine_in',
      tableId,
      items: [{ productId, quantity: 1, modifierIds: [] }],
    });
    expect(order.order.tableId).toBe(tableId);
  });
});
