import * as argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnv, requireSeedPassword } from '../config/env';
import * as schema from '../core/db/schema/index';
import { users } from '../core/db/schema/identity';
import { memberships } from '../core/db/schema/tenancy';
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

const DEMO_PINS = {
  owner: '1111',
  manager: '2222',
  cashier: '3333',
  cashier2: '4444',
  kitchen: '5555',
  pinOnlyCashier: '6666',
} as const;

async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pin, { type: argon2.argon2id });
}

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
        { suffix: 'owner', roleId: SYSTEM_OWNER_ROLE_ID, pin: DEMO_PINS.owner },
        { suffix: 'manager', roleId: SYSTEM_MANAGER_ROLE_ID, pin: DEMO_PINS.manager },
        { suffix: 'cashier', roleId: SYSTEM_CASHIER_ROLE_ID, pin: DEMO_PINS.cashier },
        { suffix: 'cashier2', roleId: SYSTEM_CASHIER_ROLE_ID, pin: DEMO_PINS.cashier2 },
        { suffix: 'kitchen', roleId: SYSTEM_KITCHEN_ROLE_ID, pin: DEMO_PINS.kitchen },
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
        const pinHash = await hashPin(entry.pin);
        const membership = await identityRepo.findMembershipForUserOrg(tx, user.id, orgDef.id);
        if (!membership) {
          await tenancyRepo.insertMembership(tx, {
            id: newUuidV7(),
            orgId: orgDef.id,
            userId: user.id,
            roleId: entry.roleId,
            allBranches: true,
            status: 'active',
            pinHash,
          });
        } else {
          await tenancyRepo.updateMembership(tx, membership.id, { pinHash });
        }
      }

      const pinOnlyName = `PIN Cashier ${orgDef.slug}`;
      const pinOnlyPinHash = await hashPin(DEMO_PINS.pinOnlyCashier);
      const pinOnlyRows = await tx
        .select({ user: users, membership: memberships })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(
          and(
            eq(memberships.orgId, orgDef.id),
            eq(users.name, pinOnlyName),
            isNull(users.email),
          ),
        )
        .limit(1);
      const pinOnlyExisting = pinOnlyRows[0];
      if (!pinOnlyExisting) {
        const userId = newUuidV7();
        await identityRepo.insertUser(tx, {
          id: userId,
          email: null,
          passwordHash: null,
          name: pinOnlyName,
          locale: 'en',
        });
        await tenancyRepo.insertMembership(tx, {
          id: newUuidV7(),
          orgId: orgDef.id,
          userId,
          roleId: SYSTEM_CASHIER_ROLE_ID,
          allBranches: true,
          status: 'active',
          pinHash: pinOnlyPinHash,
        });
      } else {
        await tenancyRepo.updateMembership(tx, pinOnlyExisting.membership.id, {
          pinHash: pinOnlyPinHash,
        });
      }
    });
  }

  await pool.end();

  process.stdout.write(`
Demo staff PINs (${SEED_ORGS.demo.slug} org — same PINs on ${SEED_ORGS.other.slug}):
  owner:            ${DEMO_PINS.owner}
  manager:          ${DEMO_PINS.manager}
  cashier:          ${DEMO_PINS.cashier}
  cashier2:         ${DEMO_PINS.cashier2}
  kitchen:          ${DEMO_PINS.kitchen}
  PIN-only cashier: ${DEMO_PINS.pinOnlyCashier}
`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
