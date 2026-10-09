import { eq } from 'drizzle-orm';
import { PERMISSION_KEYS } from '@app/shared';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { resetEnvCacheForTests } from '../../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../../src/core/db/db.module';
import { rolePermissions } from '../../src/core/db/schema/tenancy';
import { withOrg } from '../../src/core/db/with-org';
import {
  SYSTEM_KITCHEN_ROLE_ID,
  SYSTEM_OWNER_ROLE_ID,
} from '../../src/modules/identity/constants';
import { SEED_ORG } from '../factories';

describe('Owner role permissions (e2e)', () => {
  let db: DrizzleDb;

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
  });

  it('owner system role has exactly every PERMISSION_KEYS entry', async () => {
    const rows = await withOrg(db, SEED_ORG.demo.id, async (tx) =>
      tx
        .select({ key: rolePermissions.permissionKey })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, SYSTEM_OWNER_ROLE_ID)),
    );
    const keys = rows.map((r) => r.key).sort();
    const expected = [...PERMISSION_KEYS].sort();
    expect(keys).toEqual(expected);
  });

  it('kitchen system role has order read and status permissions only', async () => {
    const rows = await withOrg(db, SEED_ORG.demo.id, async (tx) =>
      tx
        .select({ key: rolePermissions.permissionKey })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, SYSTEM_KITCHEN_ROLE_ID)),
    );
    expect(rows.map((r) => r.key).sort()).toEqual(['orders.read', 'orders.update_status']);
  });
});
