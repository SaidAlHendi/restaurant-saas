import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, exists, ilike, inArray, or, type SQL } from 'drizzle-orm';
import {
  pageMeta,
  type AdminTenantUser,
  type AdminUserListQuery,
  type AdminUserListResponse,
} from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { users } from '../../../core/db/schema/identity';
import {
  branches,
  membershipBranches,
  memberships,
  organizations,
  roles,
} from '../../../core/db/schema/tenancy';
import { likePattern } from '../cursor';

/** Cross-tenant users. Only non-secret columns are readable by app_admin, so no password hash. */
@Injectable()
export class AdminUsersService {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  /** One membership has to satisfy every membership filter, so "cashier at X" stays precise. */
  private membershipCondition({ role, orgId, branchId }: AdminUserListQuery): SQL | undefined {
    if (!role && !orgId && !branchId) return undefined;

    const inBranch = branchId
      ? and(
          exists(
            this.db
              .select({ id: branches.id })
              .from(branches)
              .where(and(eq(branches.id, branchId), eq(branches.orgId, memberships.orgId))),
          ),
          or(
            eq(memberships.allBranches, true),
            exists(
              this.db
                .select({ id: membershipBranches.branchId })
                .from(membershipBranches)
                .where(
                  and(
                    eq(membershipBranches.membershipId, memberships.id),
                    eq(membershipBranches.branchId, branchId),
                  ),
                ),
            ),
          ),
        )
      : undefined;

    return exists(
      this.db
        .select({ id: memberships.id })
        .from(memberships)
        .innerJoin(roles, eq(roles.id, memberships.roleId))
        .where(
          and(
            eq(memberships.userId, users.id),
            role ? eq(roles.key, role) : undefined,
            orgId ? eq(memberships.orgId, orgId) : undefined,
            inBranch,
          ),
        ),
    );
  }

  async list(query: AdminUserListQuery): Promise<AdminUserListResponse> {
    const conditions: SQL[] = [];
    if (query.search) {
      const pattern = likePattern(query.search);
      const match = or(ilike(users.name, pattern), ilike(users.email, pattern));
      if (match) conditions.push(match);
    }
    const membership = this.membershipCondition(query);
    if (membership) conditions.push(membership);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await this.db.select({ total: count() }).from(users).where(where);
    const page = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const memberRows =
      page.length === 0
        ? []
        : await this.db
            .select({
              membershipId: memberships.id,
              allBranches: memberships.allBranches,
              userId: memberships.userId,
              orgId: memberships.orgId,
              orgName: organizations.name,
              roleKey: roles.key,
              roleName: roles.name,
              status: memberships.status,
            })
            .from(memberships)
            .innerJoin(organizations, eq(organizations.id, memberships.orgId))
            .innerJoin(roles, eq(roles.id, memberships.roleId))
            .where(
              inArray(
                memberships.userId,
                page.map((u) => u.id),
              ),
            )
            .orderBy(organizations.name);

    const limitedIds = memberRows.filter((m) => !m.allBranches).map((m) => m.membershipId);
    const branchRows =
      limitedIds.length === 0
        ? []
        : await this.db
            .select({ membershipId: membershipBranches.membershipId, name: branches.name })
            .from(membershipBranches)
            .innerJoin(branches, eq(branches.id, membershipBranches.branchId))
            .where(inArray(membershipBranches.membershipId, limitedIds))
            .orderBy(branches.name);

    const byUser = new Map<string, AdminTenantUser['memberships']>();
    for (const { userId, membershipId, allBranches, ...m } of memberRows) {
      const list = byUser.get(userId) ?? [];
      const branchNames = allBranches
        ? null
        : branchRows.filter((b) => b.membershipId === membershipId).map((b) => b.name);
      list.push({ ...m, branchNames });
      byUser.set(userId, list);
    }

    return {
      items: page.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        memberships: byUser.get(u.id) ?? [],
      })),
      ...pageMeta(query, totalRow?.total ?? 0),
    };
  }
}
