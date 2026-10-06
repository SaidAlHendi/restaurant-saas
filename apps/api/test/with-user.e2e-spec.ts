import { Test, type TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';

import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withUser } from '../src/core/db/with-user';

describe('withUser (e2e)', () => {
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

  it('sets app.user_id for the transaction via set_config', async () => {
    const userId = '00000000-0000-4000-8000-000000000099';
    const value = await withUser(db, userId, async (tx) => {
      const result = await tx.execute(
        sql`SELECT current_setting('app.user_id', true) AS user_id`,
      );
      const rows = result.rows as { user_id: string | null }[];
      return rows[0]?.user_id ?? null;
    });
    expect(value).toBe(userId);
  });
});
