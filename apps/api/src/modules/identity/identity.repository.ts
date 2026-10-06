import { and, eq, isNull, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { authSessions, users } from '../../core/db/schema/identity';
import {
  branches,
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
    await tx.insert(authSessions).values(row);
    const rows = await tx
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, row.id))
      .limit(1);
    return rows[0] ?? { ...row, createdAt: new Date(), revokedAt: null, replacedBy: null };
  }

  async findSessionByHash(tx: DrizzleTx, tokenHash: string) {
    const rows = await tx
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);
    return rows[0];
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

  async orgSlugExists(tx: DrizzleTx, slug: string): Promise<boolean> {
    const rows = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return rows.length > 0;
  }

  async insertOrganization(tx: DrizzleTx, row: typeof organizations.$inferInsert) {
    const inserted = await tx.insert(organizations).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async insertBranch(tx: DrizzleTx, row: typeof branches.$inferInsert) {
    const inserted = await tx.insert(branches).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async insertMembership(tx: DrizzleTx, row: typeof memberships.$inferInsert) {
    const inserted = await tx.insert(memberships).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async countOrganizations(tx: DrizzleTx): Promise<number> {
    const result = await tx.execute(sql`SELECT count(*)::int AS c FROM organizations`);
    const row = result.rows[0] as { c: number };
    return row.c;
  }
}
