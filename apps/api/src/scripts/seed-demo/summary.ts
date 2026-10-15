import { sql } from 'drizzle-orm';

import type { DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';

import { SEED_COVERAGE } from './coverage';

export type TableCounts = Record<string, number>;

const ORG_SCOPED_TABLES = [
  'branches',
  'memberships',
  'membership_branches',
  'categories',
  'products',
  'modifier_groups',
  'modifiers',
  'product_modifier_groups',
  'tables',
  'orders',
  'order_items',
  'order_item_modifiers',
  'payments',
  'order_events',
  'branch_counters',
] as const;

export async function countSeedOrgTables(db: DrizzleDb, orgIds: string[]): Promise<TableCounts> {
  const totals: TableCounts = {};
  totals['organizations'] = orgIds.length;

  for (const table of ORG_SCOPED_TABLES) {
    totals[table] = 0;
  }

  for (const orgId of orgIds) {
    await withOrg(db, orgId, async (tx) => {
      const queries: Record<(typeof ORG_SCOPED_TABLES)[number], ReturnType<typeof sql>> = {
        branches: sql`SELECT count(*)::int AS c FROM branches WHERE org_id = ${orgId}::uuid`,
        memberships: sql`SELECT count(*)::int AS c FROM memberships WHERE org_id = ${orgId}::uuid`,
        membership_branches: sql`SELECT count(*)::int AS c FROM membership_branches WHERE org_id = ${orgId}::uuid`,
        categories: sql`SELECT count(*)::int AS c FROM categories WHERE org_id = ${orgId}::uuid`,
        products: sql`SELECT count(*)::int AS c FROM products WHERE org_id = ${orgId}::uuid`,
        modifier_groups: sql`SELECT count(*)::int AS c FROM modifier_groups WHERE org_id = ${orgId}::uuid`,
        modifiers: sql`SELECT count(*)::int AS c FROM modifiers WHERE org_id = ${orgId}::uuid`,
        product_modifier_groups: sql`SELECT count(*)::int AS c FROM product_modifier_groups WHERE org_id = ${orgId}::uuid`,
        tables: sql`SELECT count(*)::int AS c FROM public."tables" WHERE org_id = ${orgId}::uuid`,
        orders: sql`SELECT count(*)::int AS c FROM orders WHERE org_id = ${orgId}::uuid`,
        order_items: sql`SELECT count(*)::int AS c FROM order_items WHERE org_id = ${orgId}::uuid`,
        order_item_modifiers: sql`SELECT count(*)::int AS c FROM order_item_modifiers WHERE org_id = ${orgId}::uuid`,
        payments: sql`SELECT count(*)::int AS c FROM payments WHERE org_id = ${orgId}::uuid`,
        order_events: sql`SELECT count(*)::int AS c FROM order_events WHERE org_id = ${orgId}::uuid`,
        branch_counters: sql`SELECT count(*)::int AS c FROM branch_counters WHERE org_id = ${orgId}::uuid`,
      };
      for (const table of ORG_SCOPED_TABLES) {
        const row = await tx.execute(queries[table]);
        totals[table] = (totals[table] ?? 0) + (row.rows[0] as { c: number }).c;
      }
    });
  }

  const userRow = await db.execute(sql`
    SELECT count(*)::int AS c FROM users WHERE email LIKE '%.seed.local'
  `);
  totals['users'] = (userRow.rows[0] as { c: number }).c;

  return totals;
}

export function printSummaryTable(counts: TableCounts): void {
  const lines: string[] = [
    '',
    'Demo seed summary (row counts):',
    'table                    rows',
    '------------------------ ------',
  ];

  const seededTables = Object.entries(SEED_COVERAGE)
    .filter(([, v]) => v === 'seeded')
    .map(([name]) => name)
    .sort();

  for (const table of seededTables) {
    const count = counts[table] ?? 0;
    lines.push(`${table.padEnd(24, ' ')} ${String(count)}`);
  }

  lines.push('');
  process.stdout.write(`${lines.join('\n')}\n`);
}
