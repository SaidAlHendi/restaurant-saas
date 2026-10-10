import { sql } from 'drizzle-orm';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { resetEnvCacheForTests } from '../../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../../src/core/db/db.module';

describe('RLS without tenant context (e2e)', () => {
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

  it('does not expose organizations via app.signup_slug_check without org context', async () => {
    const policy = await db.execute(sql`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'organizations_select_signup_slug'
    `);
    expect((policy.rows as unknown[]).length).toBe(0);

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.signup_slug_check', 'true', true)`);
      const result = await tx.execute(sql`SELECT count(*)::int AS c FROM organizations`);
      expect((result.rows[0] as { c: number }).c).toBe(0);
    });
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
        AND c.relname <> 'auth_sessions'
        AND c.relname <> 'outbox_events'
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
