import fs from 'node:fs/promises';
import path from 'node:path';

import { eq, sql } from 'drizzle-orm';

import type { Env } from '../../config/env';
import type { DrizzleDb } from '../../core/db/db.module';
import { productModifierGroups, products } from '../../core/db/schema/catalog';
import { diningTables } from '../../core/db/schema/ordering';
import { withOrg } from '../../core/db/with-org';
import { IMAGE_WIDTHS, imageObjectKey } from '../../core/storage/object-storage';

import {
  collectInvariantFailures,
  findOrderTotalsMismatches,
  findPaymentStatusMismatches,
  invariantBranchCounters,
  invariantCancelledWithoutPayments,
  invariantCompletedOrdersPaid,
  invariantModifierLinkRatio,
  invariantNoOffenders,
  invariantOrdersMissingPlacedEvent,
  invariantOrgBranchCount,
  invariantProductCount,
  invariantTablesPerBranch,
} from './invariants';
import type { SeededOrg } from './seed-orgs';

export type InvariantOptions = {
  /** Nothing the seed wrote may be later than this instant. */
  cutoff: Date;
  /** Check that every products.image_key has its WebP files (local storage only). */
  checkImages: boolean;
  env: Env;
};

function ids(rows: unknown[]): string[] {
  return (rows as { id: string }[]).map((r) => r.id);
}

async function missingLocalImageProducts(
  env: Env,
  rows: { id: string; image_key: string }[],
): Promise<string[]> {
  const root = env.STORAGE_LOCAL_ROOT ?? path.join(process.cwd(), '.storage');
  const missing: string[] = [];
  for (const row of rows) {
    for (const width of IMAGE_WIDTHS) {
      try {
        await fs.access(path.join(root, imageObjectKey(row.image_key, width)));
      } catch {
        missing.push(row.id);
        break;
      }
    }
  }
  return missing;
}

export async function runSeedInvariants(
  db: DrizzleDb,
  seededOrgs: SeededOrg[],
  options: InvariantOptions,
): Promise<void> {
  const failures = [];
  const cutoffIso = options.cutoff.toISOString();

  for (const seeded of seededOrgs) {
    failures.push(invariantOrgBranchCount(seeded));

    await withOrg(db, seeded.id, async (tx) => {
      const productRows = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.orgId, seeded.id));
      failures.push(invariantProductCount(seeded.definition, productRows.length));

      const linkRows = await tx
        .select({ productId: productModifierGroups.productId })
        .from(productModifierGroups)
        .where(eq(productModifierGroups.orgId, seeded.id));
      failures.push(
        invariantModifierLinkRatio(seeded.definition, linkRows.length, productRows.length),
      );

      for (const branch of seeded.branches) {
        const tableRows = await tx
          .select({ id: diningTables.id })
          .from(diningTables)
          .where(eq(diningTables.branchId, branch.id));
        failures.push(
          invariantTablesPerBranch(seeded.definition.slug, branch.key, tableRows.length),
        );
      }

      const unpaidCompleted = await tx.execute(sql`
        SELECT count(*)::int AS c FROM orders
        WHERE status = 'completed' AND payment_status <> 'paid'
      `);
      failures.push(invariantCompletedOrdersPaid((unpaidCompleted.rows[0] as { c: number }).c));

      const cancelledPaid = await tx.execute(sql`
        SELECT count(*)::int AS c FROM orders o
        WHERE o.status = 'cancelled'
          AND EXISTS (
            SELECT 1 FROM payments p
            WHERE p.order_id = o.id AND p.org_id = o.org_id AND p.status = 'captured'
          )
      `);
      failures.push(invariantCancelledWithoutPayments((cancelledPaid.rows[0] as { c: number }).c));

      const missingPlaced = await tx.execute(sql`
        SELECT count(*)::int AS c FROM orders o
        WHERE o.status <> 'draft'
          AND NOT EXISTS (
            SELECT 1 FROM order_events e
            WHERE e.order_id = o.id AND e.org_id = o.org_id AND e.type = 'order.placed'
          )
      `);
      failures.push(invariantOrdersMissingPlacedEvent((missingPlaced.rows[0] as { c: number }).c));

      const draftBadPlacedAt = await tx.execute(sql`
        SELECT count(*)::int AS c FROM orders WHERE status = 'draft' AND placed_at IS NOT NULL
      `);
      failures.push(
        invariantNoOffenders(
          'DRAFT_PLACED_AT',
          'draft order(s) with placed_at set',
          (draftBadPlacedAt.rows[0] as { c: number }).c > 0 ? ['draft'] : [],
        ),
      );

      const draftMissingDrafted = await tx.execute(sql`
        SELECT count(*)::int AS c FROM orders o
        WHERE o.status = 'draft'
          AND NOT EXISTS (
            SELECT 1 FROM order_events e
            WHERE e.order_id = o.id AND e.org_id = o.org_id AND e.type = 'order.drafted'
          )
      `);
      failures.push(
        invariantNoOffenders(
          'DRAFT_EVENT',
          'draft order(s) missing order.drafted event',
          (draftMissingDrafted.rows[0] as { c: number }).c > 0 ? ['draft'] : [],
        ),
      );

      const totalsRows = await tx.execute(sql`
        SELECT o.id::text AS id,
               coalesce(i.items_subtotal, 0)::bigint AS items_subtotal,
               o.subtotal_minor, o.discount_minor, o.tax_minor, o.total_minor,
               b.tax_rate_bp, b.tax_inclusive
        FROM orders o
        JOIN branches b ON b.id = o.branch_id
        LEFT JOIN (
          SELECT order_id, sum(line_total_minor) AS items_subtotal
          FROM order_items WHERE status <> 'voided' GROUP BY order_id
        ) i ON i.order_id = o.id
      `);
      failures.push(
        invariantNoOffenders(
          'ORDER_TOTALS',
          'order(s) whose totals differ from computeOrderTotals',
          findOrderTotalsMismatches(
            (totalsRows.rows as Record<string, string | number | boolean>[]).map((r) => ({
              id: String(r['id']),
              itemsSubtotalMinor: Number(r['items_subtotal']),
              subtotalMinor: Number(r['subtotal_minor']),
              discountMinor: Number(r['discount_minor']),
              taxMinor: Number(r['tax_minor']),
              totalMinor: Number(r['total_minor']),
              taxRateBp: Number(r['tax_rate_bp']),
              taxInclusive: r['tax_inclusive'] === true,
            })),
          ),
        ),
      );

      const paymentRows = await tx.execute(sql`
        SELECT o.id::text AS id, o.total_minor, o.payment_status::text AS payment_status,
               coalesce(p.paid, 0)::bigint AS paid
        FROM orders o
        LEFT JOIN (
          SELECT order_id, sum(amount_minor) AS paid
          FROM payments WHERE status = 'captured' GROUP BY order_id
        ) p ON p.order_id = o.id
      `);
      failures.push(
        invariantNoOffenders(
          'PAYMENT_STATUS',
          'order(s) whose payment_status differs from computePaymentStatus',
          findPaymentStatusMismatches(
            (paymentRows.rows as Record<string, string | number>[]).map((r) => ({
              id: String(r['id']),
              totalMinor: Number(r['total_minor']),
              paidMinor: Number(r['paid']),
              paymentStatus: String(r['payment_status']),
            })),
          ),
        ),
      );

      // Same formula as lib/business-date.ts (docs/data-model.md "Business date").
      const wrongBusinessDate = await tx.execute(sql`
        SELECT o.id::text AS id FROM orders o
        JOIN branches b ON b.id = o.branch_id
        WHERE o.business_date <> date(
          (o.placed_at AT TIME ZONE b.timezone) - make_interval(hours => b.day_start_hour)
        )
      `);
      failures.push(
        invariantNoOffenders(
          'BUSINESS_DATE',
          'order(s) whose business_date does not match placed_at',
          ids(wrongBusinessDate.rows),
        ),
      );

      const future = await tx.execute(sql`
        SELECT o.id::text AS id FROM orders o
        WHERE o.placed_at > ${cutoffIso}::timestamptz
           OR o.completed_at > ${cutoffIso}::timestamptz
           OR o.cancelled_at > ${cutoffIso}::timestamptz
           OR o.updated_at > ${cutoffIso}::timestamptz
           OR EXISTS (
             SELECT 1 FROM order_events e
             WHERE e.order_id = o.id AND e.created_at > ${cutoffIso}::timestamptz
           )
           OR EXISTS (
             SELECT 1 FROM payments p
             WHERE p.order_id = o.id AND p.created_at > ${cutoffIso}::timestamptz
           )
      `);
      failures.push(
        invariantNoOffenders(
          'FUTURE_TIMESTAMP',
          `order(s) with a timestamp after ${cutoffIso}`,
          ids(future.rows),
        ),
      );

      if (options.checkImages && options.env.STORAGE_DRIVER === 'local') {
        const imageRows = await tx.execute(sql`
          SELECT id::text AS id, image_key FROM products WHERE image_key IS NOT NULL
        `);
        failures.push(
          invariantNoOffenders(
            'IMAGE_FILES',
            'product(s) whose image files are missing from storage',
            await missingLocalImageProducts(
              options.env,
              imageRows.rows as { id: string; image_key: string }[],
            ),
          ),
        );
      }

      const counterRows = await tx.execute(sql`
        SELECT bc.branch_id::text AS branch_id,
               bc.business_date::text AS business_date,
               bc.last_order_number::int AS counter,
               coalesce(max(o.order_number), 0)::int AS max_n
        FROM branch_counters bc
        LEFT JOIN orders o
          ON o.branch_id = bc.branch_id
         AND o.business_date = bc.business_date
         AND o.org_id = bc.org_id
        GROUP BY bc.branch_id, bc.business_date, bc.last_order_number
      `);
      for (const row of counterRows.rows as {
        branch_id: string;
        business_date: string;
        counter: number;
        max_n: number;
      }[]) {
        failures.push(
          invariantBranchCounters(row.branch_id, row.business_date, row.counter, row.max_n),
        );
      }
    });
  }

  const problems = collectInvariantFailures(failures);
  if (problems.length > 0) {
    for (const p of problems) {
      process.stderr.write(`[seed-demo] Invariant failed (${p.code}): ${p.message}\n`);
    }
    throw new Error(`Seed invariants failed (${String(problems.length)} issue(s))`);
  }
}
