import pg from 'pg';
import { sql } from 'drizzle-orm';
import { Test, type TestingModule } from '@nestjs/testing';

import { loadEnv } from '../src/config/env';
import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';
import { SEED_ORG } from './factories';

describe('Catalog composite FK (e2e)', () => {
  let db: DrizzleDb;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    resetEnvCacheForTests();
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('rejects cross-org product/category link at database level', async () => {
    let demoCategoryId = '';
    let otherCategoryId = '';

    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      demoCategoryId = newUuidV7();
      await tx.execute(sql`
        INSERT INTO categories (id, org_id, name, sort_order, is_active)
        VALUES (${demoCategoryId}::uuid, ${SEED_ORG.demo.id}::uuid, '{"en":"Demo"}'::jsonb, 0, true)
      `);
    });

    await withOrg(db, SEED_ORG.other.id, async (tx) => {
      otherCategoryId = newUuidV7();
      await tx.execute(sql`
        INSERT INTO categories (id, org_id, name, sort_order, is_active)
        VALUES (${otherCategoryId}::uuid, ${SEED_ORG.other.id}::uuid, '{"en":"Other"}'::jsonb, 0, true)
      `);
    });

    const env = loadEnv();
    const pool = new pg.Pool({ connectionString: env.DATABASE_MIGRATION_URL });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.org_id', $1, true)`, [SEED_ORG.demo.id]);
      await expect(
        client.query(
          `INSERT INTO products (id, org_id, category_id, name, price_minor, sort_order, is_active)
           VALUES ($1, $2, $3, '{"en":"Bad"}'::jsonb, 100, 0, true)`,
          [newUuidV7(), SEED_ORG.demo.id, otherCategoryId],
        ),
      ).rejects.toMatchObject({ code: '23503' });
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await pool.end();
    }
  });
});
