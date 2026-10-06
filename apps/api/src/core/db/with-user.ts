import { sql } from 'drizzle-orm';

import type { DrizzleDb } from './db.module';
import type { DrizzleTx } from './with-org';

export async function withUser<T>(
  db: DrizzleDb,
  userId: string,
  fn: (tx: DrizzleTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
