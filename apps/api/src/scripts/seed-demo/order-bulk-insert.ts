import { sql } from 'drizzle-orm';

import {
  orderEvents,
  orderItemModifiers,
  orderItems,
  orders,
  payments,
} from '../../core/db/schema/ordering';
import type { DrizzleTx } from '../../core/db/with-org';

import type { GeneratedBranchOrders, PlannedOrder } from './order-generate';
import { ORDER_BULK_CHUNK } from './order-generate';

export async function bulkInsertGeneratedOrders(
  tx: DrizzleTx,
  generated: GeneratedBranchOrders[],
): Promise<void> {
  const planned: PlannedOrder[] = generated.flatMap((g) => g.orders);
  if (planned.length === 0) {
    return;
  }

  const orderRows = planned.map((p) => p.order);
  const itemRows = planned.flatMap((p) => p.items.map(({ modifiers: _m, ...item }) => item));
  const modifierRows = planned.flatMap((p) => p.items.flatMap((it) => it.modifiers));
  const eventRows = planned.flatMap((p) => p.events);
  const paymentRows = planned.flatMap((p) => p.payments);

  for (let i = 0; i < orderRows.length; i += ORDER_BULK_CHUNK) {
    await tx.insert(orders).values(orderRows.slice(i, i + ORDER_BULK_CHUNK));
  }
  for (let i = 0; i < itemRows.length; i += ORDER_BULK_CHUNK) {
    await tx.insert(orderItems).values(itemRows.slice(i, i + ORDER_BULK_CHUNK));
  }
  for (let i = 0; i < modifierRows.length; i += ORDER_BULK_CHUNK) {
    await tx.insert(orderItemModifiers).values(modifierRows.slice(i, i + ORDER_BULK_CHUNK));
  }
  for (let i = 0; i < eventRows.length; i += ORDER_BULK_CHUNK) {
    await tx.insert(orderEvents).values(eventRows.slice(i, i + ORDER_BULK_CHUNK));
  }
  for (let i = 0; i < paymentRows.length; i += ORDER_BULK_CHUNK) {
    await tx.insert(payments).values(paymentRows.slice(i, i + ORDER_BULK_CHUNK));
  }

  for (const branch of generated) {
    for (const [businessDate, lastOrderNumber] of branch.counterByDate) {
      await tx.execute(sql`
        INSERT INTO branch_counters (branch_id, business_date, org_id, last_order_number)
        VALUES (${branch.branchId}::uuid, ${businessDate}::date, ${branch.orgId}::uuid, ${lastOrderNumber})
        ON CONFLICT (branch_id, business_date)
        DO UPDATE SET last_order_number = GREATEST(
          branch_counters.last_order_number,
          EXCLUDED.last_order_number
        )
      `);
    }
  }
}
