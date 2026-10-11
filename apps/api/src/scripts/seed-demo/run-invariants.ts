import { eq, sql } from 'drizzle-orm';

import type { DrizzleDb } from '../../core/db/db.module';
import { productModifierGroups, products } from '../../core/db/schema/catalog';
import { diningTables } from '../../core/db/schema/ordering';
import { withOrg } from '../../core/db/with-org';

import {
  collectInvariantFailures,
  invariantBranchCounters,
  invariantCancelledWithoutPayments,
  invariantCompletedOrdersPaid,
  invariantModifierLinkRatio,
  invariantOrdersMissingPlacedEvent,
  invariantOrgBranchCount,
  invariantProductCount,
  invariantTablesPerBranch,
} from './invariants';
import type { SeededOrg } from './seed-orgs';

export async function runSeedInvariants(db: DrizzleDb, seededOrgs: SeededOrg[]): Promise<void> {
  const failures = [];

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
        invariantModifierLinkRatio(
          seeded.definition,
          linkRows.length,
          productRows.length,
        ),
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
      failures.push(
        invariantCompletedOrdersPaid((unpaidCompleted.rows[0] as { c: number }).c),
      );

      const cancelledPaid = await tx.execute(sql`
        SELECT count(*)::int AS c FROM orders o
        WHERE o.status = 'cancelled'
          AND EXISTS (
            SELECT 1 FROM payments p
            WHERE p.order_id = o.id AND p.org_id = o.org_id AND p.status = 'captured'
          )
      `);
      failures.push(
        invariantCancelledWithoutPayments((cancelledPaid.rows[0] as { c: number }).c),
      );

      const missingPlaced = await tx.execute(sql`
        SELECT count(*)::int AS c FROM orders o
        WHERE NOT EXISTS (
          SELECT 1 FROM order_events e
          WHERE e.order_id = o.id AND e.org_id = o.org_id AND e.type = 'order.placed'
        )
      `);
      failures.push(
        invariantOrdersMissingPlacedEvent((missingPlaced.rows[0] as { c: number }).c),
      );

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
