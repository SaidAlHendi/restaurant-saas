import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import {
  pageMeta,
  type AdminTenantUser,
  type AdminUserListQuery,
  type AdminUserListResponse,
} from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { users } from '../../../core/db/schema/identity';
import { memberships, organizations, roles } from '../../../core/db/schema/tenancy';
import { likePattern } from '../cursor';

/** Cross-tenant users. Only non-secret columns are readable by app_admin, so no password hash. */
@Injectable()
export class AdminUsersService {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  async list(query: AdminUserListQuery): Promise<AdminUserListResponse> {
    const conditions: SQL[] = [];
    if (query.search) {
      const pattern = likePattern(query.search);
      const match = or(ilike(users.name, pattern), ilike(users.email, pattern));
      if (match) conditions.push(match);
    }
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

    const byUser = new Map<string, AdminTenantUser['memberships']>();
    for (const { userId, ...m } of memberRows) {
      const list = byUser.get(userId) ?? [];
      list.push({ ...m, status: m.status });
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
