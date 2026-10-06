import { sql } from 'drizzle-orm';

import type { DrizzleDb } from './db.module';

export type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

/**
 * Runs `fn` in a Drizzle transaction with `app.org_id` set for RLS (SET LOCAL via set_config).
 */
export async function withOrg<T>(
  db: DrizzleDb,
  orgId: string,
  fn: (tx: DrizzleTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.org_id', ${orgId}, true)`);
    return fn(tx);
  });
}

/** Use inside an existing transaction before tenant-scoped queries. */
export function setOrgLocal(orgId: string) {
  return sql`SELECT set_config('app.org_id', ${orgId}, true)`;
}
