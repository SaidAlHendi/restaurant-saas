import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import type {
  AdminOrgDetail,
  AdminOrgStatus,
  AdminOrgStatusChange,
  AdminOrgListItem,
  AdminOrgListQuery,
  AdminOrgListResponse,
} from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb, type AdminDrizzleTx } from '../../../core/db/admin-db.tokens';
import { plans, subscriptions } from '../../../core/db/schema/billing';
import { branches, memberships, organizations, roles } from '../../../core/db/schema/tenancy';
import { users } from '../../../core/db/schema/identity';
import { ConflictError, NotFoundError } from '../../../core/errors/app-errors';
import type { AdminContext } from '../admin-context';
import { WithAdminService } from '../with-admin.service';

/** Escapes LIKE wildcards so a search for "50%" does not match everything. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

type OrgRow = typeof organizations.$inferSelect;

/** Cross-tenant queries and status changes on the admin pool (app_admin, BYPASSRLS). */
@Injectable()
export class AdminOrgsService {
  constructor(
    @Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb,
    private readonly withAdmin: WithAdminService,
  ) {}

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

  /** Blocks tenant access. Only trial, active and past_due restaurants can be suspended. */
  suspend(id: string, actor: AdminContext): Promise<AdminOrgStatusChange> {
    return this.changeStatus(id, actor, 'org.suspend', ['trial', 'active', 'past_due'], () =>
      Promise.resolve('suspended'),
    );
  }

  /**
   * Restores access. The status before the suspension is not stored, so it is rebuilt from the
   * subscription: past_due stays past_due, everything else becomes active.
   */
  reactivate(id: string, actor: AdminContext): Promise<AdminOrgStatusChange> {
    return this.changeStatus(id, actor, 'org.reactivate', ['suspended'], async (tx) => {
      const [sub] = await tx
        .select({ status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.orgId, id))
        .limit(1);
      return sub?.status === 'past_due' ? 'past_due' : 'active';
    });
  }

  /**
   * The conditional UPDATE makes the transition atomic: a concurrent change leaves zero rows and the
   * transaction rolls back, so no audit row is written for a change that did not happen.
   */
  private changeStatus(
    id: string,
    actor: AdminContext,
    action: string,
    allowedFrom: AdminOrgStatus[],
    nextStatus: (tx: AdminDrizzleTx) => Promise<AdminOrgStatus>,
  ): Promise<AdminOrgStatusChange> {
    return this.withAdmin.withAdmin(
      actor,
      { action, targetType: 'organization', targetId: id, orgId: id },
      async (tx) => {
        const [current] = await tx
          .select({ status: organizations.status })
          .from(organizations)
          .where(eq(organizations.id, id))
          .limit(1);
        if (!current) throw new NotFoundError('Restaurant not found');
        if (!allowedFrom.includes(current.status)) {
          throw new ConflictError(
            `Cannot ${action === 'org.suspend' ? 'suspend' : 'reactivate'} a restaurant that is ${current.status}`,
            { status: current.status },
            'ORG_STATUS_CONFLICT',
          );
        }
        const status = await nextStatus(tx);
        const updated = await tx
          .update(organizations)
          .set({ status })
          .where(and(eq(organizations.id, id), eq(organizations.status, current.status)))
          .returning({ id: organizations.id });
        if (updated.length === 0) {
          throw new ConflictError('Restaurant status changed, reload and try again', {}, 'ORG_STATUS_CONFLICT');
        }
        return { id, status };
      },
    );
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
