import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import type {
  AdminOrgDetail,
  AdminOrgListItem,
  AdminOrgListQuery,
  AdminOrgListResponse,
} from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { plans, subscriptions } from '../../../core/db/schema/billing';
import { branches, memberships, organizations, roles } from '../../../core/db/schema/tenancy';
import { users } from '../../../core/db/schema/identity';
import { NotFoundError } from '../../../core/errors/app-errors';

/** Escapes LIKE wildcards so a search for "50%" does not match everything. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

type OrgRow = typeof organizations.$inferSelect;

/** Read-only cross-tenant queries on the admin pool (app_admin, BYPASSRLS). */
@Injectable()
export class AdminOrgsService {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  async list(query: AdminOrgListQuery): Promise<AdminOrgListResponse> {
    const conditions: SQL[] = [];
    if (query.status) conditions.push(eq(organizations.status, query.status));
    if (query.q) {
      const pattern = likePattern(query.q);
      const match = or(ilike(organizations.name, pattern), ilike(organizations.slug, pattern));
      if (match) conditions.push(match);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await this.db.select({ total: count() }).from(organizations).where(where);
    const rows = await this.db
      .select()
      .from(organizations)
      .where(where)
      .orderBy(desc(organizations.createdAt), desc(organizations.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const items = await this.toListItems(rows);
    return { items, page: query.page, pageSize: query.pageSize, total: totalRow?.total ?? 0 };
  }

  async get(id: string): Promise<AdminOrgDetail> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    if (!org) throw new NotFoundError('Restaurant not found');

    const [item] = await this.toListItems([org]);
    const [subscription] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, id))
      .limit(1);
    const orgBranches = await this.db
      .select({
        id: branches.id,
        name: branches.name,
        slug: branches.slug,
        isActive: branches.isActive,
      })
      .from(branches)
      .where(eq(branches.orgId, id))
      .orderBy(asc(branches.createdAt));
    const [members] = await this.db
      .select({ total: count() })
      .from(memberships)
      .where(eq(memberships.orgId, id));

    return {
      ...(item as AdminOrgListItem),
      defaultCurrency: org.defaultCurrency,
      defaultLocale: org.defaultLocale,
      locales: org.locales,
      memberCount: members?.total ?? 0,
      subscription: subscription
        ? {
            status: subscription.status,
            branchQuantity: subscription.branchQuantity,
            trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            canceledAt: subscription.canceledAt?.toISOString() ?? null,
          }
        : null,
      branches: orgBranches,
    };
  }

  /** Adds plan, owner and branch count to a page of organizations with three batched queries. */
  private async toListItems(rows: OrgRow[]): Promise<AdminOrgListItem[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const planRows = await this.db
      .select({ orgId: subscriptions.orgId, key: plans.key, name: plans.name })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(inArray(subscriptions.orgId, ids));
    const ownerRows = await this.db
      .selectDistinctOn([memberships.orgId], {
        orgId: memberships.orgId,
        name: users.name,
        email: users.email,
      })
      .from(memberships)
      .innerJoin(roles, eq(roles.id, memberships.roleId))
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(inArray(memberships.orgId, ids), eq(roles.key, 'owner')))
      .orderBy(memberships.orgId, asc(memberships.createdAt));
    const branchRows = await this.db
      .select({ orgId: branches.orgId, total: count() })
      .from(branches)
      .where(inArray(branches.orgId, ids))
      .groupBy(branches.orgId);

    const planByOrg = new Map(planRows.map((r) => [r.orgId, r]));
    const ownerByOrg = new Map(ownerRows.map((r) => [r.orgId, r]));
    const branchesByOrg = new Map(branchRows.map((r) => [r.orgId, r.total]));

    return rows.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      country: org.country,
      planKey: planByOrg.get(org.id)?.key ?? null,
      planName: planByOrg.get(org.id)?.name ?? null,
      ownerName: ownerByOrg.get(org.id)?.name ?? null,
      ownerEmail: ownerByOrg.get(org.id)?.email ?? null,
      branchCount: branchesByOrg.get(org.id) ?? 0,
      createdAt: org.createdAt.toISOString(),
    }));
  }
}
