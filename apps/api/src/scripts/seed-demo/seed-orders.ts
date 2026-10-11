import { sql } from 'drizzle-orm';

import type { DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';

import type { DemoSeedCliOptions } from './cli';
import { bulkInsertGeneratedOrders } from './order-bulk-insert';
import { loadBranchOrderContexts } from './order-load-context';
import { generateBranchOrders } from './order-generate';
import type { SeededOrg } from './seed-orgs';

async function orgAlreadyHasOrders(db: DrizzleDb, orgId: string): Promise<boolean> {
  let count = 0;
  await withOrg(db, orgId, async (tx) => {
    const row = await tx.execute(sql`SELECT count(*)::int AS c FROM orders`);
    count = (row.rows[0] as { c: number }).c;
  });
  return count > 0;
}

export async function seedOrderHistory(
  db: DrizzleDb,
  seededOrgs: SeededOrg[],
  options: Pick<DemoSeedCliOptions, 'days' | 'anchor'>,
): Promise<void> {
  const anchorIso = options.anchor.toISOString();
  let totalOrders = 0;

  for (const seeded of seededOrgs) {
    if (await orgAlreadyHasOrders(db, seeded.id)) {
      process.stdout.write(
        `[seed-demo] Orders for ${seeded.definition.slug}: skipped (already seeded)\n`,
      );
      continue;
    }

    const contexts = await loadBranchOrderContexts(db, seeded);
    const generated = contexts.map((ctx) => generateBranchOrders(ctx, options, anchorIso));
    const orderCount = generated.reduce((sum, g) => sum + g.orders.length, 0);
    totalOrders += orderCount;

    await withOrg(db, seeded.id, async (tx) => {
      await bulkInsertGeneratedOrders(tx, generated);
    });

    process.stdout.write(
      `[seed-demo] Orders for ${seeded.definition.slug}: ${String(orderCount)} orders\n`,
    );
  }

  process.stdout.write(`[seed-demo] Orders total: ${String(totalOrders)} rows\n`);
}
