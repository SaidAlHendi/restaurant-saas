import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import type { OrderListCursor } from '../../lib/order-list-cursor';
import type { DrizzleTx } from '../../core/db/with-org';
import {
  branchCounters,
  diningTables,
  orderEvents,
  orderItemModifiers,
  orderItems,
  orders,
} from '../../core/db/schema/ordering';
import type { OrderStatus } from '@app/shared';

function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Expected row');
  }
  return row;
}

@Injectable()
export class OrderingRepository {
  async listTables(tx: DrizzleTx, branchId: string) {
    return tx
      .select()
      .from(diningTables)
      .where(eq(diningTables.branchId, branchId))
      .orderBy(diningTables.label);
  }

  async findTableById(tx: DrizzleTx, branchId: string, tableId: string) {
    const rows = await tx
      .select()
      .from(diningTables)
      .where(and(eq(diningTables.id, tableId), eq(diningTables.branchId, branchId)))
      .limit(1);
    return rows[0];
  }

  async insertTable(tx: DrizzleTx, row: typeof diningTables.$inferInsert) {
    return firstRow(await tx.insert(diningTables).values(row).returning());
  }

  async updateTable(
    tx: DrizzleTx,
    branchId: string,
    tableId: string,
    patch: Partial<typeof diningTables.$inferInsert>,
  ) {
    const rows = await tx
      .update(diningTables)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(diningTables.id, tableId), eq(diningTables.branchId, branchId)))
      .returning();
    return rows[0];
  }

  async findActiveTableForBranch(tx: DrizzleTx, branchId: string, tableId: string) {
    const rows = await tx
      .select()
      .from(diningTables)
      .where(
        and(
          eq(diningTables.id, tableId),
          eq(diningTables.branchId, branchId),
          eq(diningTables.isActive, true),
        ),
      )
      .limit(1);
    return rows[0];
  }

  async findOrderByClientOrderId(tx: DrizzleTx, branchId: string, clientOrderId: string) {
    const rows = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.branchId, branchId), eq(orders.clientOrderId, clientOrderId)))
      .limit(1);
    return rows[0];
  }

  async nextOrderNumber(
    tx: DrizzleTx,
    branchId: string,
    businessDate: string,
    orgId: string,
  ): Promise<number> {
    const result = await tx.execute(sql`
      INSERT INTO branch_counters (branch_id, business_date, org_id, last_order_number)
      VALUES (${branchId}::uuid, ${businessDate}::date, ${orgId}::uuid, 1)
      ON CONFLICT (branch_id, business_date)
      DO UPDATE SET last_order_number = branch_counters.last_order_number + 1
      RETURNING last_order_number
    `);
    const row = result.rows[0] as { last_order_number: number } | undefined;
    if (!row) {
      throw new Error('Counter increment failed');
    }
    return row.last_order_number;
  }

  async insertOrder(tx: DrizzleTx, row: typeof orders.$inferInsert) {
    return firstRow(await tx.insert(orders).values(row).returning());
  }

  async insertOrderItem(tx: DrizzleTx, row: typeof orderItems.$inferInsert) {
    return firstRow(await tx.insert(orderItems).values(row).returning());
  }

  async insertOrderItemModifier(tx: DrizzleTx, row: typeof orderItemModifiers.$inferInsert) {
    return firstRow(await tx.insert(orderItemModifiers).values(row).returning());
  }

  async insertOrderEvent(tx: DrizzleTx, row: typeof orderEvents.$inferInsert) {
    return firstRow(await tx.insert(orderEvents).values(row).returning());
  }

  async findOrderById(tx: DrizzleTx, branchId: string, orderId: string) {
    const rows = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.branchId, branchId)))
      .limit(1);
    return rows[0];
  }

  async listOrderItemsWithModifiers(tx: DrizzleTx, orderId: string) {
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(orderItems.createdAt, orderItems.id);
    const result = [];
    for (const item of items) {
      const modifiers = await tx
        .select()
        .from(orderItemModifiers)
        .where(eq(orderItemModifiers.orderItemId, item.id));
      result.push({ item, modifiers });
    }
    return result;
  }

  async countNonVoidedItems(tx: DrizzleTx, orderId: string): Promise<number> {
    const result = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), sql`${orderItems.status} <> 'voided'`));
    return result[0]?.count ?? 0;
  }

  async listOrders(
    tx: DrizzleTx,
    branchId: string,
    opts: {
      status?: OrderStatus;
      businessDate?: string;
      cursor?: OrderListCursor;
      limit: number;
    },
  ) {
    const conditions = [eq(orders.branchId, branchId)];
    if (opts.status) {
      conditions.push(eq(orders.status, opts.status));
    }
    if (opts.businessDate) {
      conditions.push(eq(orders.businessDate, opts.businessDate));
    }
    if (opts.cursor) {
      conditions.push(
        or(
          lt(orders.createdAt, new Date(opts.cursor.createdAt)),
          and(
            eq(orders.createdAt, new Date(opts.cursor.createdAt)),
            lt(orders.id, opts.cursor.id),
          ),
        ) ?? sql`true`,
      );
    }
    return tx
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(opts.limit + 1);
  }

  async countItemsForOrders(tx: DrizzleTx, orderIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (orderIds.length === 0) {
      return map;
    }
    const result = await tx
      .select({
        orderId: orderItems.orderId,
        count: sql<number>`count(*)::int`,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .groupBy(orderItems.orderId);
    for (const row of result) {
      map.set(row.orderId, row.count);
    }
    return map;
  }

  async updateOrderStatus(
    tx: DrizzleTx,
    orderId: string,
    fromStatus: OrderStatus,
    expectedVersion: number,
    patch: Partial<typeof orders.$inferInsert>,
  ) {
    const rows = await tx
      .update(orders)
      .set({ ...patch, version: expectedVersion + 1, updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.status, fromStatus),
          eq(orders.version, expectedVersion),
        ),
      )
      .returning();
    return rows[0];
  }

  async updateOrderTotals(
    tx: DrizzleTx,
    orderId: string,
    expectedVersion: number,
    totals: {
      subtotalMinor: number;
      discountMinor: number;
      taxMinor: number;
      totalMinor: number;
    },
  ) {
    const rows = await tx
      .update(orders)
      .set({
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        version: expectedVersion + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.version, expectedVersion)))
      .returning();
    return rows[0];
  }

  async syncItemStatusesForOrder(
    tx: DrizzleTx,
    orderId: string,
    target: 'preparing' | 'ready',
    fromStatuses: Array<'pending' | 'preparing'>,
  ) {
    await tx
      .update(orderItems)
      .set({ status: target })
      .where(
        and(
          eq(orderItems.orderId, orderId),
          inArray(orderItems.status, fromStatuses),
        ),
      );
  }

  async findOrderItem(tx: DrizzleTx, orderId: string, itemId: string) {
    const rows = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .limit(1);
    return rows[0];
  }

  async voidOrderItem(
    tx: DrizzleTx,
    itemId: string,
    voidedBy: string,
    reason: string,
    voidedAt: Date,
  ) {
    const rows = await tx
      .update(orderItems)
      .set({
        status: 'voided',
        voidedAt,
        voidReason: reason,
        voidedBy,
      })
      .where(eq(orderItems.id, itemId))
      .returning();
    return rows[0];
  }

  async listOrderEvents(tx: DrizzleTx, orderId: string) {
    return tx
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, orderId))
      .orderBy(orderEvents.createdAt, orderEvents.id);
  }

  async getCounterValue(tx: DrizzleTx, branchId: string, businessDate: string) {
    const rows = await tx
      .select()
      .from(branchCounters)
      .where(
        and(eq(branchCounters.branchId, branchId), eq(branchCounters.businessDate, businessDate)),
      )
      .limit(1);
    return rows[0];
  }
}
