import { sql } from 'drizzle-orm';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';

describe('Database role (e2e)', () => {
  let db: DrizzleDb;

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
  });

  it('API pool user is not superuser and not BYPASSRLS', async () => {
    const result = await db.execute(
      sql`SELECT rolsuper AS super, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`,
    );
    const row = result.rows[0] as { super: boolean; bypass: boolean };
    expect(row.super).toBe(false);
    expect(row.bypass).toBe(false);
  });
});
