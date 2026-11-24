import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import {
  pageMeta,
  type AdminAuditListQuery,
  type AdminAuditListResponse,
} from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { adminUsers, auditLogs } from '../../../core/db/schema/admin';
import { likePattern } from '../cursor';

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
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(auditLogs)
      .innerJoin(adminUsers, eq(adminUsers.id, auditLogs.adminUserId))
      .where(where);
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
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    return {
      items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      ...pageMeta(query, totalRow?.total ?? 0),
    };
  }
}
