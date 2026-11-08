import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, lt, or, type SQL } from 'drizzle-orm';
import {
  ADMIN_CURSOR_PAGE_SIZE,
  type AdminTenantUser,
  type AdminUserListQuery,
  type AdminUserListResponse,
} from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { users } from '../../../core/db/schema/identity';
import { memberships, organizations, roles } from '../../../core/db/schema/tenancy';
import { decodeCursor, encodeCursor, likePattern } from '../cursor';

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
    if (query.cursor) {
      const c = decodeCursor(query.cursor);
      const before = or(
        lt(users.createdAt, c.createdAt),
        and(eq(users.createdAt, c.createdAt), lt(users.id, c.id)),
      );
      if (before) conditions.push(before);
    }

    const rows = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(ADMIN_CURSOR_PAGE_SIZE + 1);

    const page = rows.slice(0, ADMIN_CURSOR_PAGE_SIZE);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > ADMIN_CURSOR_PAGE_SIZE && last ? encodeCursor(last.createdAt, last.id) : null;

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
      nextCursor,
    };
  }
}
