import { sql } from 'drizzle-orm';
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
import { demoOwnerContext, insertDiningTable, seedCatalogProduct } from './ordering-helpers';

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

    await expect(
      failingOrdering.createOrder(ctx, branchId, {
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      }),
    ).rejects.toThrow('outbox write failed');

    let eventsBefore = 0;
    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const events = await tx.execute(sql`SELECT count(*)::int AS c FROM order_events`);
      eventsBefore = (events.rows[0] as { c: number }).c;
    });

    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const orders = await tx.execute(sql`
        SELECT id FROM orders WHERE client_order_id = ${clientOrderId}::uuid
      `);
      expect(orders.rows).toHaveLength(0);
      const eventsAfter = await tx.execute(sql`SELECT count(*)::int AS c FROM order_events`);
      expect((eventsAfter.rows[0] as { c: number }).c).toBe(eventsBefore);
    });
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
