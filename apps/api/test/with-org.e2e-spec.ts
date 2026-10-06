import { Test, type TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';

import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';

describe('withOrg (e2e)', () => {
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

  it('sets app.org_id for the transaction via set_config', async () => {
    const orgId = '00000000-0000-4000-8000-000000000001';
    const value = await withOrg(db, orgId, async (tx) => {
      const result = await tx.execute(
        sql`SELECT current_setting('app.org_id', true) AS org_id`,
      );
      const rows = result.rows as { org_id: string | null }[];
      return rows[0]?.org_id ?? null;
    });
    expect(value).toBe(orgId);
  });
});
