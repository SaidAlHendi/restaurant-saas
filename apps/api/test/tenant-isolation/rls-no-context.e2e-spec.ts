import { sql } from 'drizzle-orm';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { resetEnvCacheForTests } from '../../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../../src/core/db/db.module';

describe('RLS without tenant context (e2e)', () => {
  let db: DrizzleDb;

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
  });

  it('app_user sees zero rows on every public table with org_id when unset', async () => {
    const tables = await db.execute(sql`
      SELECT c.relname AS table_name
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
      ORDER BY c.relname
    `);
    const names = (tables.rows as { table_name: string }[]).map((r) => r.table_name);
    expect(names.length).toBeGreaterThan(0);

    for (const tableName of names) {
      const countResult = await db.execute(
        sql.raw(`SELECT count(*)::int AS c FROM public.${tableName}`),
      );
      const count = (countResult.rows[0] as { c: number }).c;
      expect(count).toBe(0);
    }
  });
});
