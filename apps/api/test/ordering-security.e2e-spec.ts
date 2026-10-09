import { sql } from 'drizzle-orm';
import pg from 'pg';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { loadEnv, resetEnvCacheForTests } from '../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { SEED_ORG } from './factories';

describe('Ordering security (e2e)', () => {
  let db: DrizzleDb;

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
  });

  it('denies UPDATE and DELETE on order_events for app_user', async () => {
    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      await expect(
        tx.execute(sql`UPDATE order_events SET type = 'tampered' WHERE false`),
      ).rejects.toThrow();
      await expect(tx.execute(sql`DELETE FROM order_events WHERE false`)).rejects.toThrow();
    });
  });

  it('app_worker cannot SELECT from orders', async () => {
    const env = loadEnv();
    if (!env.DATABASE_WORKER_URL) {
      throw new Error('DATABASE_WORKER_URL is required for this test');
    }
    const pool = new pg.Pool({ connectionString: env.DATABASE_WORKER_URL });
    try {
      await expect(pool.query('SELECT id FROM orders LIMIT 1')).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await pool.end();
    }
  });
});
