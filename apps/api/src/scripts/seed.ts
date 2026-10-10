import { readFileSync } from 'node:fs';
import path from 'node:path';

import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { PERMISSION_KEYS } from '@app/shared';

import { loadEnv, requireSeedPassword, type Env } from '../config/env';
import * as schema from '../core/db/schema/index';
import { withOrg } from '../core/db/with-org';
import { newUuidV7 } from '../lib/uuid';
import {
  SYSTEM_CASHIER_ROLE_ID,
  SYSTEM_KITCHEN_ROLE_ID,
  SYSTEM_MANAGER_ROLE_ID,
  SYSTEM_OWNER_ROLE_ID,
} from '../modules/identity/constants';
import { organizations } from '../core/db/schema/tenancy';
import { IdentityRepository } from '../modules/identity/identity.repository';
import { TenancyRepository } from '../modules/tenancy/tenancy.repository';

const SEED_ORGS = {
  demo: { id: '00000000-0000-4000-8000-000000000201', name: 'Demo Restaurant', slug: 'demo' },
  other: { id: '00000000-0000-4000-8000-000000000202', name: 'Other Restaurant', slug: 'other' },
} as const;

/** Idempotent permission inserts from `0004_catalog_tables.sql` and `0005_ordering_tables.sql`. */
const CATALOG_AND_ORDERING_ROLE_PERMISSIONS_SQL = `
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

INSERT INTO public.role_permissions (role_id, permission_key, org_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'menu.read', NULL),
  ('00000000-0000-4000-8000-000000000102', 'menu.read', NULL),
  ('00000000-0000-4000-8000-000000000103', 'menu.read', NULL)
ON CONFLICT (role_id, permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_key, org_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'orders.read', NULL),
  ('00000000-0000-4000-8000-000000000101', 'orders.update_status', NULL),
  ('00000000-0000-4000-8000-000000000102', 'orders.read', NULL),
  ('00000000-0000-4000-8000-000000000102', 'orders.update_status', NULL),
  ('00000000-0000-4000-8000-000000000103', 'orders.read', NULL),
  ('00000000-0000-4000-8000-000000000103', 'orders.update_status', NULL),
  ('00000000-0000-4000-8000-000000000104', 'orders.read', NULL),
  ('00000000-0000-4000-8000-000000000104', 'orders.update_status', NULL)
ON CONFLICT (role_id, permission_key) DO NOTHING;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions FORCE ROW LEVEL SECURITY;
`;

/** Re-applies system role seed SQL when roles or permissions were wiped but migrations still recorded. */
async function ensureSystemRolesSeed(env: Env): Promise<void> {
  const pool = new pg.Pool({ connectionString: env.DATABASE_MIGRATION_URL });
  try {
    const count = await pool.query<{ c: number }>('SELECT count(*)::int AS c FROM public.roles');
    const roleCount = count.rows[0]?.c ?? 0;
    if (roleCount === 0) {
      const sqlPath = path.join(process.cwd(), 'drizzle/0003_seed_system_roles.sql');
      await pool.query(readFileSync(sqlPath, 'utf8'));
    }

    const ownerPerms = await pool.query<{ c: number }>(
      'SELECT count(*)::int AS c FROM public.role_permissions WHERE role_id = $1::uuid',
      [SYSTEM_OWNER_ROLE_ID],
    );
    const ownerPermCount = ownerPerms.rows[0]?.c ?? 0;
    if (ownerPermCount < PERMISSION_KEYS.length) {
      const sqlPath = path.join(process.cwd(), 'drizzle/0003_seed_system_roles.sql');
      await pool.query(readFileSync(sqlPath, 'utf8'));
      await pool.query(CATALOG_AND_ORDERING_ROLE_PERMISSIONS_SQL);
    }
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  await ensureSystemRolesSeed(env);
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
      } else {
        await tx
          .update(organizations)
          .set({ status: 'trial' })
          .where(eq(organizations.id, orgDef.id));
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
