import { sql } from 'drizzle-orm';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { resetEnvCacheForTests } from '../../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../../src/core/db/db.module';
import { withOrg } from '../../src/core/db/with-org';
import {
  SYSTEM_CASHIER_ROLE_ID,
  SYSTEM_OWNER_ROLE_ID,
} from '../../src/modules/identity/constants';
import { SEED_ORG } from '../factories';

describe('System role write protection (e2e)', () => {
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

  it('cannot mutate system roles or permissions from tenant context', async () => {
    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const updateRole = await tx.execute(sql`
        UPDATE public.roles SET name = 'Hacked' WHERE id = ${SYSTEM_OWNER_ROLE_ID}::uuid
      `);
      expect(updateRole.rowCount).toBe(0);

      const deleteRole = await tx.execute(sql`
        DELETE FROM public.roles WHERE id = ${SYSTEM_OWNER_ROLE_ID}::uuid
      `);
      expect(deleteRole.rowCount).toBe(0);

      await expect(
        tx.execute(sql`
          INSERT INTO public.role_permissions (role_id, permission_key)
          VALUES (${SYSTEM_OWNER_ROLE_ID}::uuid, 'branches.read')
        `),
      ).rejects.toThrow();

      await expect(
        tx.execute(sql`
          INSERT INTO public.role_permissions (role_id, permission_key)
          VALUES (${SYSTEM_CASHIER_ROLE_ID}::uuid, 'staff.manage')
        `),
      ).rejects.toThrow();
    });
  });
});
