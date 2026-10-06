import { and, eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { users } from '../../core/db/schema/identity';
import {
  branches,
  membershipBranches,
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
export class TenancyRepository {
  async listBranches(tx: DrizzleTx, orgId: string) {
    return tx.select().from(branches).where(eq(branches.orgId, orgId)).orderBy(branches.name);
  }

  async findBranchById(tx: DrizzleTx, branchId: string) {
    const rows = await tx.select().from(branches).where(eq(branches.id, branchId)).limit(1);
    return rows[0];
  }

  async insertBranch(tx: DrizzleTx, row: typeof branches.$inferInsert) {
    const inserted = await tx.insert(branches).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async updateBranch(tx: DrizzleTx, branchId: string, patch: Partial<typeof branches.$inferInsert>) {
    const updated = await tx
      .update(branches)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(branches.id, branchId))
      .returning();
    return updated[0];
  }

  async branchSlugExistsInOrg(tx: DrizzleTx, orgId: string, slug: string) {
    const rows = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.orgId, orgId), eq(branches.slug, slug)))
      .limit(1);
    return rows.length > 0;
  }

  async listMembershipsWithUsers(tx: DrizzleTx) {
    return tx
      .select({
        membership: memberships,
        user: users,
        role: roles,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .orderBy(users.email);
  }

  async listMembershipBranchIds(tx: DrizzleTx, membershipId: string): Promise<string[]> {
    const rows = await tx
      .select({ branchId: membershipBranches.branchId })
      .from(membershipBranches)
      .where(eq(membershipBranches.membershipId, membershipId));
    return rows.map((r) => r.branchId);
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

  async insertOrganization(tx: DrizzleTx, row: typeof organizations.$inferInsert) {
    const inserted = await tx.insert(organizations).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async insertMembership(tx: DrizzleTx, row: typeof memberships.$inferInsert) {
    const inserted = await tx.insert(memberships).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async findOrganizationById(tx: DrizzleTx, orgId: string) {
    const rows = await tx.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return rows[0];
  }
}
