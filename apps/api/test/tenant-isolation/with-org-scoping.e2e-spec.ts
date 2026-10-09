import * as argon2 from 'argon2';
import { eq, sql } from 'drizzle-orm';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { resetEnvCacheForTests } from '../../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../../src/core/db/db.module';
import { users as usersTable } from '../../src/core/db/schema/identity';
import { memberships, organizations } from '../../src/core/db/schema/tenancy';
import { withOrg } from '../../src/core/db/with-org';
import { withUser } from '../../src/core/db/with-user';
import { newUuidV7 } from '../../src/lib/uuid';
import { SYSTEM_OWNER_ROLE_ID } from '../../src/modules/identity/constants';
import { SEED_ORG } from '../factories';

describe('withOrg vs withUser scoping (e2e)', () => {
  let db: DrizzleDb;
  let moduleRef: TestingModule;
  const dualUserId = newUuidV7();

  beforeAll(async () => {
    resetEnvCacheForTests();
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);

    const passwordHash = await argon2.hash('dual-user-password-12', { type: argon2.argon2id });
    await db.insert(usersTable).values({
      id: dualUserId,
      email: `dual-${dualUserId.slice(-8)}@example.com`,
      passwordHash,
      name: 'Dual Org User',
      locale: 'en',
      lastOrgId: SEED_ORG.demo.id,
    });

    for (const org of [SEED_ORG.demo, SEED_ORG.other]) {
      await withOrg(db, org.id, async (tx) => {
        await tx.insert(memberships).values({
          id: newUuidV7(),
          orgId: org.id,
          userId: dualUserId,
          roleId: SYSTEM_OWNER_ROLE_ID,
          allBranches: true,
          status: 'active',
        });
      });
    }
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('withOrg(A) does not leak org B rows in memberships or organizations', async () => {
    const orgRows = await withOrg(db, SEED_ORG.demo.id, async (tx) =>
      tx.select({ id: organizations.id }).from(organizations),
    );
    expect(orgRows.every((r) => r.id === SEED_ORG.demo.id)).toBe(true);

    const membershipRows = await withOrg(db, SEED_ORG.demo.id, async (tx) =>
      tx.select({ orgId: memberships.orgId }).from(memberships).where(eq(memberships.userId, dualUserId)),
    );
    expect(membershipRows.length).toBe(1);
    expect(membershipRows[0]?.orgId).toBe(SEED_ORG.demo.id);
  });

  it('withUser lists both org memberships without setting app.org_id', async () => {
    const rows = await withUser(db, dualUserId, async (tx) => {
      const result = await tx.execute(sql`
        SELECT org_id FROM public.memberships WHERE user_id = ${dualUserId}::uuid ORDER BY org_id
      `);
      return result.rows as { org_id: string }[];
    });
    expect(rows.map((r) => r.org_id).sort()).toEqual(
      [SEED_ORG.demo.id, SEED_ORG.other.id].sort(),
    );
  });
});
