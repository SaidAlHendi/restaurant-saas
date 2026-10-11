import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { DrizzleDb } from '../../core/db/db.module';
import {
  modifierGroups,
  modifiers,
  productModifierGroups,
  products,
} from '../../core/db/schema/catalog';
import { diningTables } from '../../core/db/schema/ordering';
import { branches, membershipBranches, memberships } from '../../core/db/schema/tenancy';
import { withOrg } from '../../core/db/with-org';
import { SYSTEM_CASHIER_ROLE_ID } from '../../modules/identity/constants';
import type { LocalizedText } from '@app/shared';

import type { SeededOrg } from './seed-orgs';

export type SeedModifier = {
  id: string;
  groupId: string;
  nameSnapshot: LocalizedText;
  priceDeltaMinor: number;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
};

export type SeedProduct = {
  id: string;
  nameSnapshot: LocalizedText;
  priceMinor: number;
  sortOrder: number;
  isActive: boolean;
  modifiers: SeedModifier[];
};

export type BranchOrderContext = {
  orgId: string;
  branchId: string;
  timezone: string;
  dayStartHour: number;
  taxRateBp: number;
  taxInclusive: boolean;
  currency: string;
  tableIds: string[];
  cashierMembershipId: string;
  products: SeedProduct[];
};

export async function loadBranchOrderContexts(
  db: DrizzleDb,
  seeded: SeededOrg,
): Promise<BranchOrderContext[]> {
  const contexts: BranchOrderContext[] = [];

  await withOrg(db, seeded.id, async (tx) => {
    const branchRows = await tx
      .select()
      .from(branches)
      .where(eq(branches.orgId, seeded.id));

    const productRows = await tx
      .select()
      .from(products)
      .where(and(eq(products.orgId, seeded.id), isNull(products.deletedAt)));

    const activeProducts = productRows.filter((p) => p.isActive);
    const productIds = activeProducts.map((p) => p.id);

    const linkRows =
      productIds.length === 0
        ? []
        : await tx
            .select({
              productId: productModifierGroups.productId,
              groupId: productModifierGroups.groupId,
              sortOrder: productModifierGroups.sortOrder,
            })
            .from(productModifierGroups)
            .where(inArray(productModifierGroups.productId, productIds));

    const groupIds = [...new Set(linkRows.map((l) => l.groupId))];
    const groupRows =
      groupIds.length === 0
        ? []
        : await tx
            .select()
            .from(modifierGroups)
            .where(and(inArray(modifierGroups.id, groupIds), isNull(modifierGroups.deletedAt)));

    const modifierRows =
      groupIds.length === 0
        ? []
        : await tx
            .select()
            .from(modifiers)
            .where(
              and(inArray(modifiers.groupId, groupIds), isNull(modifiers.deletedAt), eq(modifiers.isActive, true)),
            );

    const productsBuilt: SeedProduct[] = activeProducts.map((p) => {
      const links = linkRows.filter((l) => l.productId === p.id);
      const mods: SeedModifier[] = [];
      for (const link of links) {
        const group = groupRows.find((g) => g.id === link.groupId);
        if (!group) {
          continue;
        }
        const groupMods = modifierRows
          .filter((m) => m.groupId === group.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        for (const mod of groupMods) {
          mods.push({
            id: mod.id,
            groupId: group.id,
            nameSnapshot: mod.name as LocalizedText,
            priceDeltaMinor: mod.priceDeltaMinor,
            minSelect: group.minSelect,
            maxSelect: group.maxSelect,
            sortOrder: link.sortOrder,
          });
        }
      }
      return {
        id: p.id,
        nameSnapshot: p.name as LocalizedText,
        priceMinor: p.priceMinor,
        sortOrder: p.sortOrder,
        isActive: p.isActive,
        modifiers: mods,
      };
    });

    for (const branch of branchRows) {
      const tableRows = await tx
        .select({ id: diningTables.id })
        .from(diningTables)
        .where(and(eq(diningTables.branchId, branch.id), eq(diningTables.isActive, true)));

      const cashierRows = await tx
        .select({ membershipId: memberships.id })
        .from(membershipBranches)
        .innerJoin(memberships, eq(membershipBranches.membershipId, memberships.id))
        .where(
          and(
            eq(membershipBranches.branchId, branch.id),
            eq(memberships.orgId, seeded.id),
            eq(memberships.roleId, SYSTEM_CASHIER_ROLE_ID),
            eq(memberships.status, 'active'),
          ),
        )
        .limit(1);

      const cashierMembershipId = cashierRows[0]?.membershipId;
      if (!cashierMembershipId) {
        throw new Error(`No cashier membership for branch ${branch.id}`);
      }

      contexts.push({
        orgId: seeded.id,
        branchId: branch.id,
        timezone: branch.timezone,
        dayStartHour: branch.dayStartHour,
        taxRateBp: branch.taxRateBp,
        taxInclusive: branch.taxInclusive,
        currency: branch.currency,
        tableIds: tableRows.map((t) => t.id),
        cashierMembershipId,
        products: productsBuilt,
      });
    }
  });

  return contexts;
}
