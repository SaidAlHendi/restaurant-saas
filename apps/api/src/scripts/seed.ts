import * as argon2 from 'argon2';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnv, requireSeedPassword } from '../config/env';
import * as schema from '../core/db/schema/index';
import { withOrg } from '../core/db/with-org';
import { newUuidV7 } from '../lib/uuid';
import {
  SYSTEM_CASHIER_ROLE_ID,
  SYSTEM_KITCHEN_ROLE_ID,
  SYSTEM_MANAGER_ROLE_ID,
  SYSTEM_OWNER_ROLE_ID,
} from '../modules/identity/constants';
import { IdentityRepository } from '../modules/identity/identity.repository';
import { TenancyRepository } from '../modules/tenancy/tenancy.repository';

const SEED_ORGS = {
  demo: { id: '00000000-0000-4000-8000-000000000201', name: 'Demo Restaurant', slug: 'demo' },
  other: { id: '00000000-0000-4000-8000-000000000202', name: 'Other Restaurant', slug: 'other' },
} as const;

async function main(): Promise<void> {
  const env = loadEnv();
  const passwordHash = await argon2.hash(requireSeedPassword(), { type: argon2.argon2id });

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const identityRepo = new IdentityRepository();
  const tenancyRepo = new TenancyRepository();

  for (const orgDef of Object.values(SEED_ORGS)) {
    await withOrg(db, orgDef.id, async (tx) => {
      const existing = await tenancyRepo.findOrganizationById(tx, orgDef.id);
      if (!existing) {
        await tenancyRepo.insertOrganization(tx, {
          id: orgDef.id,
          name: orgDef.name,
          slug: orgDef.slug,
          country: 'SA',
          defaultCurrency: 'SAR',
          defaultLocale: 'en',
          locales: ['en', 'ar'],
          status: 'trial',
        });
      }

      for (let i = 1; i <= 2; i += 1) {
        const slug = i === 1 ? 'main' : `branch-${String(i)}`;
        if (!(await tenancyRepo.branchSlugExistsInOrg(tx, orgDef.id, slug))) {
          await tenancyRepo.insertBranch(tx, {
            id: newUuidV7(),
            orgId: orgDef.id,
            name: `${orgDef.name} ${String(i)}`,
            slug,
            timezone: 'Asia/Riyadh',
            currency: 'SAR',
          });
        }
      }

      const roleUsers = [
        { suffix: 'owner', roleId: SYSTEM_OWNER_ROLE_ID },
        { suffix: 'manager', roleId: SYSTEM_MANAGER_ROLE_ID },
        { suffix: 'cashier', roleId: SYSTEM_CASHIER_ROLE_ID },
        { suffix: 'kitchen', roleId: SYSTEM_KITCHEN_ROLE_ID },
      ] as const;

      for (const entry of roleUsers) {
        const email = `${entry.suffix}@${orgDef.slug}.local`;
        let user = await identityRepo.findUserByEmail(tx, email);
        if (!user) {
          user = await identityRepo.insertUser(tx, {
            id: newUuidV7(),
            email,
            passwordHash,
            name: `${entry.suffix} ${orgDef.slug}`,
            locale: 'en',
            lastOrgId: orgDef.id,
          });
        } else {
          await identityRepo.updateUserPasswordHash(tx, user.id, passwordHash);
        }
        const existingMembership = await identityRepo.findMembershipForUserOrg(tx, user.id, orgDef.id);
        if (!existingMembership) {
          await tenancyRepo.insertMembership(tx, {
            id: newUuidV7(),
            orgId: orgDef.id,
            userId: user.id,
            roleId: entry.roleId,
            allBranches: true,
            status: 'active',
          });
        }
      }
    });
  }

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
