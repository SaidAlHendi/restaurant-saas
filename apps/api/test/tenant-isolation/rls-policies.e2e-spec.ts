import { sql } from 'drizzle-orm';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { resetEnvCacheForTests } from '../../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../../src/core/db/db.module';

describe('RLS policy guard (e2e)', () => {
  let db: DrizzleDb;

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
  });

  it('every table with org_id has RLS enabled, forced, and a policy', async () => {
    const result = await db.execute(sql`
      SELECT c.relname AS table_name,
             c.relrowsecurity AS rls_enabled,
             c.relforcerowsecurity AS rls_forced,
             (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = c.relname) AS policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND EXISTS (
          SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = 'public'
            AND col.table_name = c.relname
            AND col.column_name = 'org_id'
        )
    `);
    const rows = result.rows as {
      table_name: string;
      rls_enabled: boolean;
      rls_forced: boolean;
      policy_count: number;
    }[];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.rls_enabled).toBe(true);
      expect(row.rls_forced).toBe(true);
      expect(row.policy_count).toBeGreaterThan(0);
    }
  });
});
