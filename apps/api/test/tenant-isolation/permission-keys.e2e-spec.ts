import { eq } from 'drizzle-orm';
import { PERMISSION_KEYS } from '@app/shared';
import { Test } from '@nestjs/testing';
import pg from 'pg';

import { AppModule } from '../../src/app.module';
import { loadEnv, resetEnvCacheForTests } from '../../src/config/env';
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
    const env = loadEnv();
    const ownerUrl = env.DATABASE_URL.replace('app_user:app_user_dev', 'app_owner:app_owner_dev');
    const migrationPool = new pg.Pool({ connectionString: ownerUrl });
    await migrationPool.query(`DELETE FROM public.role_permissions WHERE role_id = $1`, [
      SYSTEM_KITCHEN_ROLE_ID,
    ]);
    const remaining = await migrationPool.query(
      `SELECT permission_key FROM public.role_permissions WHERE role_id = $1`,
      [SYSTEM_KITCHEN_ROLE_ID],
    );
    await migrationPool.end();
    if (remaining.rows.length > 0) {
      throw new Error(
        `Kitchen role permissions remain after cleanup (${ownerUrl}): ${JSON.stringify(remaining.rows)}`,
      );
    }

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

  it('kitchen system role has no permissions in item 2', async () => {
    const env = loadEnv();
    const ownerUrl = env.DATABASE_URL.replace('app_user:app_user_dev', 'app_owner:app_owner_dev');
    const pool = new pg.Pool({ connectionString: ownerUrl });
    const rows = await pool.query<{ permission_key: string }>(
      `SELECT permission_key FROM public.role_permissions WHERE role_id = $1`,
      [SYSTEM_KITCHEN_ROLE_ID],
    );
    await pool.end();
    expect(rows.rows.map((r) => r.permission_key)).toEqual([]);
  });
});
