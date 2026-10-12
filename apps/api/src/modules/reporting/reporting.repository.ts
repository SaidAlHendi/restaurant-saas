import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import type { OrderType, PaymentMethod } from '@app/shared';

import type { DrizzleTx } from '../../core/db/with-org';
import { orders } from '../../core/db/schema/ordering';

import { COUNTED_ORDER_STATUSES } from './daily-report.utils';

function countedStatusesSqlInList(): SQL {
  return sql.join(
    COUNTED_ORDER_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  );
}

type OrderDayRollup = {
  ordersCount: number;
  salesMinor: number;
  taxMinor: number;
  cancelledCount: number;
  draftCount: number;
};

@Injectable()
export class ReportingRepository {
  async loadOrderDayRollup(tx: DrizzleTx, branchId: string, businessDate: string): Promise<OrderDayRollup> {
    const countedIn = countedStatusesSqlInList();
    const result = await tx.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN (${countedIn}))::int AS orders_count,
        COALESCE(SUM(total_minor) FILTER (WHERE status IN (${countedIn})), 0)::bigint AS sales_minor,
        COALESCE(SUM(tax_minor) FILTER (WHERE status IN (${countedIn})), 0)::bigint AS tax_minor,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_count
      FROM orders
      WHERE branch_id = ${branchId}::uuid
        AND business_date = ${businessDate}::date
    `);
    const row = result.rows[0] as
      | {
          orders_count: number;
          sales_minor: string | number;
          tax_minor: string | number;
          cancelled_count: number;
          draft_count: number;
        }
      | undefined;
    if (!row) {
      return {
        ordersCount: 0,
        salesMinor: 0,
        taxMinor: 0,
        cancelledCount: 0,
        draftCount: 0,
      };
    }
    return {
      ordersCount: row.orders_count,
      salesMinor: Number(row.sales_minor),
      taxMinor: Number(row.tax_minor),
      cancelledCount: row.cancelled_count,
      draftCount: row.draft_count,
    };
  }

  async loadSalesByType(
    tx: DrizzleTx,
    branchId: string,
    businessDate: string,
  ): Promise<Array<{ type: OrderType; ordersCount: number; salesMinor: number }>> {
    const rows = await tx
      .select({
        type: orders.type,
        ordersCount: sql<number>`count(*)::int`,
        salesMinor: sql<bigint>`coalesce(sum(${orders.totalMinor}), 0)::bigint`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.branchId, branchId),
          eq(orders.businessDate, businessDate),
          inArray(orders.status, [...COUNTED_ORDER_STATUSES]),
        ),
      )
      .groupBy(orders.type);
    return rows.map((row) => ({
      type: row.type,
      ordersCount: row.ordersCount,
      salesMinor: Number(row.salesMinor),
    }));
  }

  async loadPaidMinorOnCountedOrders(
    tx: DrizzleTx,
    branchId: string,
    businessDate: string,
  ): Promise<number> {
    const countedIn = countedStatusesSqlInList();
    const result = await tx.execute(sql`
      SELECT COALESCE(SUM(p.amount_minor), 0)::bigint AS paid_minor
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      WHERE o.branch_id = ${branchId}::uuid
        AND o.business_date = ${businessDate}::date
        AND o.status IN (${countedIn})
        AND p.status = 'captured'
    `);
    const row = result.rows[0] as { paid_minor: string | number } | undefined;
    return row ? Number(row.paid_minor) : 0;
  }

  async loadPaymentsByMethod(
    tx: DrizzleTx,
    branchId: string,
    businessDate: string,
  ): Promise<Array<{ method: PaymentMethod; paymentsCount: number; amountMinor: number }>> {
    const countedIn = countedStatusesSqlInList();
    const result = await tx.execute(sql`
      SELECT p.method, COUNT(*)::int AS payments_count, COALESCE(SUM(p.amount_minor), 0)::bigint AS amount_minor
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      WHERE o.branch_id = ${branchId}::uuid
        AND o.business_date = ${businessDate}::date
        AND o.status IN (${countedIn})
        AND p.status = 'captured'
      GROUP BY p.method
    `);
    return result.rows.map((r) => {
      const row = r as { method: PaymentMethod; payments_count: number; amount_minor: string | number };
      return {
        method: row.method,
        paymentsCount: row.payments_count,
        amountMinor: Number(row.amount_minor),
      };
    });
  }

  async loadTopItems(
    tx: DrizzleTx,
    branchId: string,
    businessDate: string,
  ): Promise<
    Array<{
      productId: string;
      nameSnapshot: Record<string, string>;
      quantity: number;
      revenueMinor: number;
    }>
  > {
    const countedIn = countedStatusesSqlInList();
    const result = await tx.execute(sql`
      WITH ranked AS (
        SELECT
          oi.product_id,
          SUM(oi.quantity)::int AS quantity,
          SUM(oi.line_total_minor)::bigint AS revenue_minor
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.branch_id = ${branchId}::uuid
          AND o.business_date = ${businessDate}::date
          AND o.status IN (${countedIn})
          AND oi.status <> 'voided'
        GROUP BY oi.product_id
        ORDER BY quantity DESC, revenue_minor DESC, product_id
        LIMIT 10
      ),
      names AS (
        SELECT DISTINCT ON (oi.product_id)
          oi.product_id,
          oi.product_name_snapshot AS name_snapshot
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.branch_id = ${branchId}::uuid
          AND o.business_date = ${businessDate}::date
          AND o.status IN (${countedIn})
          AND oi.status <> 'voided'
        ORDER BY oi.product_id, oi.created_at DESC, oi.id DESC
      )
      SELECT r.product_id, n.name_snapshot, r.quantity, r.revenue_minor
      FROM ranked r
      JOIN names n ON n.product_id = r.product_id
      ORDER BY r.quantity DESC, r.revenue_minor DESC, r.product_id
    `);
    return result.rows.map((r) => {
      const row = r as {
        product_id: string;
        name_snapshot: Record<string, string>;
        quantity: number;
        revenue_minor: string | number;
      };
      return {
        productId: row.product_id,
        nameSnapshot: row.name_snapshot,
        quantity: row.quantity,
        revenueMinor: Number(row.revenue_minor),
      };
    });
  }
}
