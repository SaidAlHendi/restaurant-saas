import { Inject, Injectable } from '@nestjs/common';

import { ADMIN_DRIZZLE, type AdminDrizzleDb, type AdminDrizzleTx } from '../../core/db/admin-db.tokens';
import { auditLogs } from '../../core/db/schema/admin';
import { newUuidV7 } from '../../lib/uuid';
import type { AdminContext } from './admin-context';

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  orgId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Runs `fn` on the admin pool and writes the audit row in the same transaction, so a mutation and its
 * audit record commit or roll back together. Every mutating admin endpoint must go through this.
 */
@Injectable()
export class WithAdminService {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  async withAdmin<T>(
    actor: Pick<AdminContext, 'adminUserId' | 'role' | 'ip'>,
    audit: AuditEntry,
    fn: (tx: AdminDrizzleTx) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      const result = await fn(tx);
      await tx.insert(auditLogs).values({
        id: newUuidV7(),
        adminUserId: actor.adminUserId,
        actorRole: actor.role,
        action: audit.action,
        targetType: audit.targetType ?? null,
        targetId: audit.targetId ?? null,
        orgId: audit.orgId ?? null,
        payload: audit.payload ?? {},
        ip: actor.ip ?? null,
      });
      return result;
    });
  }
}
