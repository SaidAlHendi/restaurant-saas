import { and, asc, eq, sql } from 'drizzle-orm';
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
      .orderBy(asc(users.name), asc(users.id));
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

  async updateOrganization(tx: DrizzleTx, orgId: string, patch: Partial<typeof organizations.$inferInsert>) {
    const updated = await tx
      .update(organizations)
      .set(patch)
      .where(eq(organizations.id, orgId))
      .returning();
    return updated[0];
  }

  async findMembershipById(tx: DrizzleTx, membershipId: string) {
    const rows = await tx.select().from(memberships).where(eq(memberships.id, membershipId)).limit(1);
    return rows[0];
  }

  async findMembershipWithUserRole(tx: DrizzleTx, membershipId: string) {
    const rows = await tx
      .select({
        membership: memberships,
        user: users,
        role: roles,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(eq(memberships.id, membershipId))
      .limit(1);
    return rows[0];
  }

  async listStaffWithUsers(tx: DrizzleTx) {
    return tx
      .select({
        membership: memberships,
        user: users,
        role: roles,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .orderBy(asc(users.name), asc(memberships.id));
  }

  async findRoleByKey(tx: DrizzleTx, roleKey: string) {
    const rows = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.key, roleKey), eq(roles.isSystem, true)))
      .limit(1);
    return rows[0];
  }

  async countActiveOwners(tx: DrizzleTx, orgId: string): Promise<number> {
    const ownerRole = await this.findRoleByKey(tx, 'owner');
    if (!ownerRole) {
      return 0;
    }
    const rows = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.orgId, orgId),
          eq(memberships.roleId, ownerRole.id),
          eq(memberships.status, 'active'),
        ),
      );
    return rows.length;
  }

  async lockActiveOwnerMembershipsForUpdate(tx: DrizzleTx, orgId: string): Promise<string[]> {
    const ownerRole = await this.findRoleByKey(tx, 'owner');
    if (!ownerRole) {
      return [];
    }
    const rows = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.orgId, orgId),
          eq(memberships.roleId, ownerRole.id),
          eq(memberships.status, 'active'),
        ),
      )
      .for('update');
    return rows.map((r) => r.id);
  }

  async activateInvitedMembership(tx: DrizzleTx, membershipId: string): Promise<boolean> {
    const updated = await tx
      .update(memberships)
      .set({
        status: 'active',
        inviteTokenHash: null,
        inviteExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(memberships.id, membershipId), eq(memberships.status, 'invited')))
      .returning({ id: memberships.id });
    return updated[0] !== undefined;
  }

  async findMembershipByOrgAndEmail(tx: DrizzleTx, orgId: string, email: string) {
    const rows = await tx
      .select({ membership: memberships })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.orgId, orgId), eq(users.email, email.toLowerCase())))
      .limit(1);
    return rows[0]?.membership;
  }

  async replaceMembershipBranches(
    tx: DrizzleTx,
    membershipId: string,
    orgId: string,
    branchIds: string[],
  ): Promise<void> {
    await tx.delete(membershipBranches).where(eq(membershipBranches.membershipId, membershipId));
    if (branchIds.length === 0) {
      return;
    }
    await tx.insert(membershipBranches).values(
      branchIds.map((branchId) => ({
        membershipId,
        branchId,
        orgId,
      })),
    );
  }

  async deleteMembership(tx: DrizzleTx, membershipId: string): Promise<void> {
    await tx.delete(memberships).where(eq(memberships.id, membershipId));
  }

  async updateMembership(
    tx: DrizzleTx,
    membershipId: string,
    patch: Partial<typeof memberships.$inferInsert>,
  ) {
    const updated = await tx
      .update(memberships)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(memberships.id, membershipId))
      .returning();
    return updated[0];
  }

  async listBranchIdsForOrg(tx: DrizzleTx, orgId: string): Promise<string[]> {
    const rows = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.orgId, orgId));
    return rows.map((r) => r.id);
  }

  async resolveInviteByTokenHash(tx: DrizzleTx, tokenHash: string) {
    const result = await tx.execute(sql`
      SELECT
        membership_id,
        org_id,
        org_name,
        email,
        role_key,
        status,
        invite_expires_at
      FROM public.resolve_invite(${tokenHash})
    `);
    const row = result.rows[0] as
      | {
          membership_id: string;
          org_id: string;
          org_name: string;
          email: string | null;
          role_key: string;
          status: string;
          invite_expires_at: Date;
        }
      | undefined;
    if (!row) {
      return undefined;
    }
    const inviteExpiresAt =
      row.invite_expires_at instanceof Date
        ? row.invite_expires_at
        : new Date(row.invite_expires_at);
    return {
      membershipId: row.membership_id,
      orgId: row.org_id,
      orgName: row.org_name,
      email: row.email,
      roleKey: row.role_key,
      status: row.status,
      inviteExpiresAt,
    };
  }
}
