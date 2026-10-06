import { and, eq, isNull } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { authSessions, users } from '../../core/db/schema/identity';
import {
  memberships,
  organizations,
  rolePermissions,
  roles,
} from '../../core/db/schema/tenancy';
import type { DrizzleTx } from '../../core/db/with-org';

function firstInsertedRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Insert did not return a row');
  }
  return row;
}

@Injectable()
export class IdentityRepository {
  async findUserByEmail(tx: DrizzleTx, email: string) {
    const rows = await tx.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return rows[0];
  }

  async findUserById(tx: DrizzleTx, id: string) {
    const rows = await tx.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async insertUser(
    tx: DrizzleTx,
    row: typeof users.$inferInsert,
  ): Promise<typeof users.$inferSelect> {
    const inserted = await tx.insert(users).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async updateUserLastOrg(tx: DrizzleTx, userId: string, orgId: string) {
    await tx.update(users).set({ lastOrgId: orgId, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async updateUserLastLogin(tx: DrizzleTx, userId: string) {
    await tx
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserPasswordHash(tx: DrizzleTx, userId: string, passwordHash: string) {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async insertSession(tx: DrizzleTx, row: typeof authSessions.$inferInsert) {
    const inserted = await tx.insert(authSessions).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async findSessionByHash(tx: DrizzleTx, tokenHash: string) {
    const rows = await tx
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);
    return rows[0];
  }

  async findSessionById(tx: DrizzleTx, sessionId: string) {
    const rows = await tx
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, sessionId))
      .limit(1);
    return rows[0];
  }

  /**
   * Atomically revoke the current refresh session and insert its replacement.
   * Returns false when the row was already rotated (reuse / race).
   */
  async rotateRefreshSession(
    tx: DrizzleTx,
    input: {
      currentSessionId: string;
      newSession: typeof authSessions.$inferInsert;
    },
  ): Promise<boolean> {
    const updated = await tx
      .update(authSessions)
      .set({ revokedAt: new Date(), replacedBy: input.newSession.id })
      .where(
        and(
          eq(authSessions.id, input.currentSessionId),
          isNull(authSessions.revokedAt),
          isNull(authSessions.replacedBy),
        ),
      )
      .returning({ id: authSessions.id });
    if (updated.length === 0) {
      return false;
    }
    await this.insertSession(tx, input.newSession);
    return true;
  }

  async revokeSession(tx: DrizzleTx, sessionId: string, replacedBy?: string) {
    await tx
      .update(authSessions)
      .set({
        revokedAt: new Date(),
        ...(replacedBy ? { replacedBy } : {}),
      })
      .where(eq(authSessions.id, sessionId));
  }

  async revokeSessionFamily(tx: DrizzleTx, familyId: string) {
    await tx
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.familyId, familyId), isNull(authSessions.revokedAt)));
  }

  async listActiveMembershipsForUser(tx: DrizzleTx, userId: string) {
    return tx
      .select({
        membership: memberships,
        org: organizations,
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.orgId, organizations.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, 'active')))
      .orderBy(memberships.createdAt);
  }

  async findMembershipForUserOrg(tx: DrizzleTx, userId: string, orgId: string) {
    const rows = await tx
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
      .limit(1);
    return rows[0];
  }

  async loadRolePermissions(tx: DrizzleTx, roleId: string): Promise<string[]> {
    const rows = await tx
      .select({ key: rolePermissions.permissionKey })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
    return rows.map((r) => r.key);
  }

  async findRoleById(tx: DrizzleTx, roleId: string) {
    const rows = await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    return rows[0];
  }
}
