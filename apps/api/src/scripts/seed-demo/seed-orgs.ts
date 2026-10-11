import * as argon2 from 'argon2';
import type { DrizzleDb } from '../../core/db/db.module';
import { membershipBranches, memberships } from '../../core/db/schema/tenancy';
import { withOrg } from '../../core/db/with-org';
import { IdentityRepository } from '../../modules/identity/identity.repository';
import {
  SYSTEM_CASHIER_ROLE_ID,
  SYSTEM_KITCHEN_ROLE_ID,
  SYSTEM_MANAGER_ROLE_ID,
  SYSTEM_OWNER_ROLE_ID,
} from '../../modules/identity/constants';
import { TenancyRepository } from '../../modules/tenancy/tenancy.repository';
import { OrderingRepository } from '../../modules/ordering/ordering.repository';

import type { OrgSeedDefinition } from './data/types';
import { hashSeedString, deterministicQrToken, deterministicUuid } from './random';

export type SeededBranch = {
  key: string;
  id: string;
  slug: string;
};

export type SeededOrg = {
  definition: OrgSeedDefinition;
  id: string;
  branches: SeededBranch[];
};

const TAX_RATE_BP = 1500;

function staffEmail(orgSlug: string, localPart: string): string {
  return `${localPart}@${orgSlug}.seed.local`;
}

async function ensureUser(
  identityRepo: IdentityRepository,
  tx: Parameters<Parameters<DrizzleDb['transaction']>[0]>[0],
  input: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    locale: 'ar' | 'en';
    lastOrgId: string;
  },
): Promise<string> {
  const existing = await identityRepo.findUserByEmail(tx, input.email);
  if (existing) {
    await identityRepo.updateUserPasswordHash(tx, existing.id, input.passwordHash);
    return existing.id;
  }
  const inserted = await identityRepo.insertUser(tx, {
    id: input.id,
    email: input.email,
    passwordHash: input.passwordHash,
    name: input.name,
    locale: input.locale,
    lastOrgId: input.lastOrgId,
  });
  return inserted.id;
}

async function ensureMembership(
  tenancyRepo: TenancyRepository,
  identityRepo: IdentityRepository,
  tx: Parameters<Parameters<DrizzleDb['transaction']>[0]>[0],
  row: typeof memberships.$inferInsert,
): Promise<string> {
  const byUser = await identityRepo.findMembershipForUserOrg(tx, row.userId, row.orgId);
  if (byUser) {
    return byUser.id;
  }
  const inserted = await tenancyRepo.insertMembership(tx, row);
  return inserted.id;
}

export async function seedOrganizationTree(
  db: DrizzleDb,
  definition: OrgSeedDefinition,
  passwordHash: string,
): Promise<SeededOrg> {
  const orgId = deterministicUuid('org', definition.slug);
  const tenancyRepo = new TenancyRepository();
  const identityRepo = new IdentityRepository();
  const orderingRepo = new OrderingRepository();

  const branches: SeededBranch[] = [];

  await withOrg(db, orgId, async (tx) => {
    const existingOrg = await tenancyRepo.findOrganizationById(tx, orgId);
    if (!existingOrg) {
      await tenancyRepo.insertOrganization(tx, {
        id: orgId,
        name: `${definition.name.ar} / ${definition.name.en}`,
        slug: definition.slug,
        country: 'SA',
        defaultCurrency: 'SAR',
        defaultLocale: definition.defaultLocale,
        locales: ['ar', 'en'],
        status: 'trial',
      });
    }

    for (const branchDef of definition.branches) {
      const branchId = deterministicUuid('branch', definition.slug, branchDef.key);
      const exists = await tenancyRepo.branchSlugExistsInOrg(tx, orgId, branchDef.slug);
      if (!exists) {
        await tenancyRepo.insertBranch(tx, {
          id: branchId,
          orgId,
          name: `${branchDef.name.ar} / ${branchDef.name.en}`,
          slug: branchDef.slug,
          timezone: 'Asia/Riyadh',
          currency: 'SAR',
          taxRateBp: TAX_RATE_BP,
          taxInclusive: branchDef.taxInclusive ?? definition.taxInclusive,
          dayStartHour: 4,
          address: `${branchDef.city.en}, Saudi Arabia`,
          receiptHeader: `${definition.name.en} — ${branchDef.name.en}`,
          receiptFooter: 'Shukran / Thank you',
          isActive: true,
        });
      }
      branches.push({ key: branchDef.key, id: branchId, slug: branchDef.slug });
    }

    const locale = definition.defaultLocale;
    const ownerUserId = await ensureUser(identityRepo, tx, {
      id: deterministicUuid('user', definition.slug, 'owner1'),
      email: staffEmail(definition.slug, 'owner1'),
      passwordHash,
      name: locale === 'ar' ? 'مالك' : 'Owner',
      locale,
      lastOrgId: orgId,
    });
    await ensureMembership(tenancyRepo, identityRepo, tx, {
      id: deterministicUuid('membership', definition.slug, 'owner1'),
      orgId,
      userId: ownerUserId,
      roleId: SYSTEM_OWNER_ROLE_ID,
      allBranches: true,
      status: 'active',
    });

    const managerUserId = await ensureUser(identityRepo, tx, {
      id: deterministicUuid('user', definition.slug, 'manager1'),
      email: staffEmail(definition.slug, 'manager1'),
      passwordHash,
      name: locale === 'ar' ? 'مدير' : 'Manager',
      locale,
      lastOrgId: orgId,
    });
    await ensureMembership(tenancyRepo, identityRepo, tx, {
      id: deterministicUuid('membership', definition.slug, 'manager1'),
      orgId,
      userId: managerUserId,
      roleId: SYSTEM_MANAGER_ROLE_ID,
      allBranches: true,
      status: 'active',
    });

    let cashierIndex = 1;
    let kitchenIndex = 1;
    for (const branch of branches) {
      for (let c = 0; c < 2; c += 1) {
        const local = `cashier${String(cashierIndex)}`;
        cashierIndex += 1;
        const userId = await ensureUser(identityRepo, tx, {
          id: deterministicUuid('user', definition.slug, local),
          email: staffEmail(definition.slug, local),
          passwordHash,
          name: locale === 'ar' ? `كاشير ${local}` : local,
          locale,
          lastOrgId: orgId,
        });
        const membershipId = await ensureMembership(tenancyRepo, identityRepo, tx, {
          id: deterministicUuid('membership', definition.slug, local),
          orgId,
          userId,
          roleId: SYSTEM_CASHIER_ROLE_ID,
          allBranches: false,
          status: 'active',
        });
        await tx
          .insert(membershipBranches)
          .values({ membershipId, branchId: branch.id, orgId })
          .onConflictDoNothing();
      }

      const kitchenLocal = `kitchen${String(kitchenIndex)}`;
      kitchenIndex += 1;
      const kitchenUserId = await ensureUser(identityRepo, tx, {
        id: deterministicUuid('user', definition.slug, kitchenLocal),
        email: staffEmail(definition.slug, kitchenLocal),
        passwordHash,
        name: locale === 'ar' ? 'مطبخ' : 'Kitchen',
        locale,
        lastOrgId: orgId,
      });
      const kitchenMembershipId = await ensureMembership(tenancyRepo, identityRepo, tx, {
        id: deterministicUuid('membership', definition.slug, kitchenLocal),
        orgId,
        userId: kitchenUserId,
        roleId: SYSTEM_KITCHEN_ROLE_ID,
        allBranches: false,
        status: 'active',
      });
      await tx
        .insert(membershipBranches)
        .values({ membershipId: kitchenMembershipId, branchId: branch.id, orgId })
        .onConflictDoNothing();

      const tableSeed = hashSeedString(`${definition.slug}:tables:${branch.key}`);
      const tableCount = 8 + (tableSeed % 13);
      for (let t = 1; t <= tableCount; t += 1) {
        const label = `T-${String(t)}`;
        const tableId = deterministicUuid('table', definition.slug, branch.key, label);
        const tableExists = await orderingRepo.findTableById(tx, branch.id, tableId);
        if (!tableExists) {
          await orderingRepo.insertTable(tx, {
            id: tableId,
            orgId,
            branchId: branch.id,
            label,
            qrToken: deterministicQrToken(`${definition.slug}:${branch.key}`, label),
            isActive: true,
          });
        }
      }
    }
  });

  return { definition, id: orgId, branches };
}

export async function hashSeedPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
