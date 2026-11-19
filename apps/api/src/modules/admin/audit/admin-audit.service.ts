import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, lt, or, type SQL } from 'drizzle-orm';
import {
  ADMIN_CURSOR_PAGE_SIZE,
  type AdminAuditListQuery,
  type AdminAuditListResponse,
} from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { adminUsers, auditLogs } from '../../../core/db/schema/admin';
import { decodeCursor, encodeCursor, likePattern } from '../cursor';

@Injectable()
export class AdminAuditService {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  async list(query: AdminAuditListQuery): Promise<AdminAuditListResponse> {
    const conditions: SQL[] = [];
    if (query.actor) {
      const pattern = likePattern(query.actor);
      const match = or(ilike(adminUsers.email, pattern), ilike(adminUsers.name, pattern));
      if (match) conditions.push(match);
    }
    if (query.action) conditions.push(ilike(auditLogs.action, likePattern(query.action)));
    if (query.cursor) {
      const c = decodeCursor(query.cursor);
      const before = or(
        lt(auditLogs.createdAt, c.createdAt),
        and(eq(auditLogs.createdAt, c.createdAt), lt(auditLogs.id, c.id)),
      );
      if (before) conditions.push(before);
    }

    const rows = await this.db
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        actorId: adminUsers.id,
        actorName: adminUsers.name,
        actorEmail: adminUsers.email,
        actorRole: auditLogs.actorRole,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        orgId: auditLogs.orgId,
        ip: auditLogs.ip,
      })
      .from(auditLogs)
      .innerJoin(adminUsers, eq(adminUsers.id, auditLogs.adminUserId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(ADMIN_CURSOR_PAGE_SIZE + 1);

    const page = rows.slice(0, ADMIN_CURSOR_PAGE_SIZE);
    const last = page[page.length - 1];
    return {
      items: page.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      nextCursor:
        rows.length > ADMIN_CURSOR_PAGE_SIZE && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }
}
