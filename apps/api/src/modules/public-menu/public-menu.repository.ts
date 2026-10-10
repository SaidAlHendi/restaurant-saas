import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';

import {
  categories,
  modifierGroups,
  modifiers,
  productModifierGroups,
  products,
} from '../../core/db/schema/catalog';
import { branches, organizations } from '../../core/db/schema/tenancy';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import type { DrizzleTx } from '../../core/db/with-org';

export type PublicResolveOrgRow = {
  org_id: string;
  status: string;
  default_locale: string;
  locales: string[];
};

export type PublicResolveTableRow = {
  org_id: string;
  branch_id: string;
  table_id: string;
  label: string;
};

export type PublicSitemapRow = {
  slug: string;
  default_locale: string;
  locales: string[];
};

@Injectable()
export class PublicMenuRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async resolveOrg(slug: string): Promise<PublicResolveOrgRow | undefined> {
    const result = await this.db.execute(
      sql`SELECT org_id, status, default_locale, locales FROM public.public_resolve_org(${slug})`,
    );
    const row = result.rows[0] as PublicResolveOrgRow | undefined;
    return row;
  }

  async resolveTable(token: string): Promise<PublicResolveTableRow | undefined> {
    const result = await this.db.execute(
      sql`SELECT org_id, branch_id, table_id, label FROM public.public_resolve_table(${token})`,
    );
    const row = result.rows[0] as PublicResolveTableRow | undefined;
    return row;
  }

  async listSitemapOrgs(): Promise<PublicSitemapRow[]> {
    const result = await this.db.execute(
      sql`SELECT slug, default_locale, locales FROM public.public_list_menu_sitemap()`,
    );
    return result.rows as PublicSitemapRow[];
  }

  async findOrganization(tx: DrizzleTx, orgId: string) {
    const rows = await tx
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        defaultLocale: organizations.defaultLocale,
        locales: organizations.locales,
        defaultCurrency: organizations.defaultCurrency,
        logoKey: organizations.logoKey,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    return rows[0];
  }

  async listActiveBranches(tx: DrizzleTx, orgId: string) {
    return tx
      .select({
        name: branches.name,
        slug: branches.slug,
        address: branches.address,
      })
      .from(branches)
      .where(and(eq(branches.orgId, orgId), eq(branches.isActive, true)))
      .orderBy(asc(branches.name));
  }

  async findActiveBranchBySlug(tx: DrizzleTx, orgId: string, branchSlug: string) {
    const rows = await tx
      .select({
        name: branches.name,
        slug: branches.slug,
        address: branches.address,
      })
      .from(branches)
      .where(
        and(
          eq(branches.orgId, orgId),
          eq(branches.slug, branchSlug),
          eq(branches.isActive, true),
        ),
      )
      .limit(1);
    return rows[0];
  }

  async findBranchSlugs(tx: DrizzleTx, orgId: string, branchId: string) {
    const rows = await tx
      .select({
        slug: branches.slug,
        orgSlug: organizations.slug,
        defaultLocale: organizations.defaultLocale,
      })
      .from(branches)
      .innerJoin(organizations, eq(branches.orgId, organizations.id))
      .where(and(eq(branches.orgId, orgId), eq(branches.id, branchId)))
      .limit(1);
    return rows[0];
  }

  async listActiveCategories(tx: DrizzleTx, orgId: string) {
    return tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.orgId, orgId),
          eq(categories.isActive, true),
          isNull(categories.deletedAt),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.id));
  }

  async listActiveProductsForCategoryIds(tx: DrizzleTx, orgId: string, categoryIds: string[]) {
    if (categoryIds.length === 0) {
      return [];
    }
    return tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.orgId, orgId),
          inArray(products.categoryId, categoryIds),
          eq(products.isActive, true),
          isNull(products.deletedAt),
        ),
      )
      .orderBy(asc(products.categoryId), asc(products.sortOrder), asc(products.id));
  }

  async listProductModifierGroupsForProductIds(tx: DrizzleTx, productIds: string[]) {
    if (productIds.length === 0) {
      return [];
    }
    return tx
      .select({
        link: productModifierGroups,
        group: modifierGroups,
      })
      .from(productModifierGroups)
      .innerJoin(modifierGroups, eq(productModifierGroups.groupId, modifierGroups.id))
      .where(
        and(
          inArray(productModifierGroups.productId, productIds),
          isNull(modifierGroups.deletedAt),
        ),
      )
      .orderBy(
        asc(productModifierGroups.productId),
        asc(productModifierGroups.sortOrder),
        asc(modifierGroups.id),
      );
  }

  async listActiveModifiersForGroupIds(tx: DrizzleTx, groupIds: string[]) {
    if (groupIds.length === 0) {
      return [];
    }
    return tx
      .select()
      .from(modifiers)
      .where(
        and(
          inArray(modifiers.groupId, groupIds),
          eq(modifiers.isActive, true),
          isNull(modifiers.deletedAt),
        ),
      )
      .orderBy(asc(modifiers.groupId), asc(modifiers.sortOrder), asc(modifiers.id));
  }
}
