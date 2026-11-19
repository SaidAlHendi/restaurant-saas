import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { currencyDigits } from '@app/shared';
import type { MoneyDisplay, MoneyKind, OrderType, PaymentMethod } from '@app/shared';

import type { DrizzleTx } from '../../core/db/with-org';
import { orders } from '../../core/db/schema/ordering';

import { COUNTED_ORDER_STATUSES } from './daily-report.utils';

function countedStatusesSqlInList(): SQL {
  return sql.join(
    COUNTED_ORDER_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  );
}

/** Report amounts are converted to this display currency; null = keep the branch currency. */
export type ReportConversion = { baseCurrency: string; display: MoneyDisplay } | null;

/**
 * SQL for one amount of an order (or of its items/payments) in report currency. An order frozen
 * in the report's display currency uses its own rate and rounding; any other order (created
 * before the display currency was switched on) uses the current ones. Rounds once, half up, the
 * same way as `convertMinorToDisplay` in `@app/shared`.
 * `ordersAlias` is how the query names the orders table.
 */
function reportAmountSql(
  amount: SQL,
  ordersAlias: 'o' | 'orders',
  kind: MoneyKind,
  conversion: ReportConversion,
): SQL {
  if (conversion === null) {
    return amount;
  }
  const { display, baseCurrency } = conversion;
  const o = sql.raw(ordersAlias);
  const frozen = sql`${o}.display_currency = ${display.currency}`;
  const currentStep = kind === 'total' ? display.totalStep : display.itemStep;
  const stepColumn = sql.raw(kind === 'total' ? 'display_total_step' : 'display_item_step');
  const displayScale = sql.raw(String(10 ** currencyDigits(display.currency)));
  const baseScale = sql.raw(String(10 ** currencyDigits(baseCurrency)));
  const rate = sql`(CASE WHEN ${frozen} THEN ${o}.exchange_rate ELSE ${display.rate}::numeric END)`;
  const step = sql`(CASE WHEN ${frozen} THEN ${o}.${stepColumn} ELSE ${currentStep}::int END)`;
  const unit = sql`(CASE WHEN ${step} > 0 THEN ${step} * ${displayScale} ELSE 1 END)`;
  return sql`(round((${amount})::numeric * ${rate} * ${displayScale} / (${baseScale} * ${unit})) * ${unit})`;
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
  async loadOrderDayRollup(
    tx: DrizzleTx,
    branchId: string,
    businessDate: string,
    conversion: ReportConversion,
  ): Promise<OrderDayRollup> {
    const countedIn = countedStatusesSqlInList();
    const total = reportAmountSql(sql`o.total_minor`, 'o', 'total', conversion);
    const tax = reportAmountSql(sql`o.tax_minor`, 'o', 'item', conversion);
    const result = await tx.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE o.status IN (${countedIn}))::int AS orders_count,
        COALESCE(SUM(${total}) FILTER (WHERE o.status IN (${countedIn})), 0)::bigint AS sales_minor,
        COALESCE(SUM(${tax}) FILTER (WHERE o.status IN (${countedIn})), 0)::bigint AS tax_minor,
        COUNT(*) FILTER (WHERE o.status = 'cancelled')::int AS cancelled_count,
        COUNT(*) FILTER (WHERE o.status = 'draft')::int AS draft_count
      FROM orders o
      WHERE o.branch_id = ${branchId}::uuid
        AND o.business_date = ${businessDate}::date
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
    conversion: ReportConversion,
  ): Promise<Array<{ type: OrderType; ordersCount: number; salesMinor: number }>> {
    const total = reportAmountSql(sql`${orders.totalMinor}`, 'orders', 'total', conversion);
    const rows = await tx
      .select({
        type: orders.type,
        ordersCount: sql<number>`count(*)::int`,
        salesMinor: sql<bigint>`coalesce(sum(${total}), 0)::bigint`,
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
    conversion: ReportConversion,
  ): Promise<number> {
    const countedIn = countedStatusesSqlInList();
    const amount = reportAmountSql(sql`p.amount_minor`, 'o', 'total', conversion);
    const result = await tx.execute(sql`
      SELECT COALESCE(SUM(${amount}), 0)::bigint AS paid_minor
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
    conversion: ReportConversion,
  ): Promise<Array<{ method: PaymentMethod; paymentsCount: number; amountMinor: number }>> {
    const countedIn = countedStatusesSqlInList();
    const amount = reportAmountSql(sql`p.amount_minor`, 'o', 'total', conversion);
    const result = await tx.execute(sql`
      SELECT p.method, COUNT(*)::int AS payments_count, COALESCE(SUM(${amount}), 0)::bigint AS amount_minor
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
    conversion: ReportConversion,
  ): Promise<
    Array<{
      productId: string;
      nameSnapshot: Record<string, string>;
      quantity: number;
      revenueMinor: number;
    }>
  > {
    const countedIn = countedStatusesSqlInList();
    const lineTotal = reportAmountSql(sql`oi.line_total_minor`, 'o', 'item', conversion);
    const result = await tx.execute(sql`
      WITH ranked AS (
        SELECT
          oi.product_id,
          SUM(oi.quantity)::int AS quantity,
          SUM(${lineTotal})::bigint AS revenue_minor
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
