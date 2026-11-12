import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { computeEffectivePermissions } from '@app/shared';

import { users } from '../../core/db/schema/identity';
import { orders } from '../../core/db/schema/ordering';
import {
  branches,
  membershipBranches,
  memberships,
  organizations,
  posDevices,
  membershipPermissionOverrides,
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

  async listPermissionOverrides(tx: DrizzleTx, membershipId: string) {
    const rows = await tx
      .select({
        key: membershipPermissionOverrides.permissionKey,
        effect: membershipPermissionOverrides.effect,
      })
      .from(membershipPermissionOverrides)
      .where(eq(membershipPermissionOverrides.membershipId, membershipId));
    return {
      grant: rows.filter((r) => r.effect === 'grant').map((r) => r.key),
      deny: rows.filter((r) => r.effect === 'deny').map((r) => r.key),
    };
  }

  /** Role permissions plus the employee's grants, minus their denies. */
  async loadEffectivePermissions(tx: DrizzleTx, membershipId: string, roleId: string): Promise<string[]> {
    const [rolePerms, overrides] = await Promise.all([
      this.loadRolePermissions(tx, roleId),
      this.listPermissionOverrides(tx, membershipId),
    ]);
    return computeEffectivePermissions(rolePerms, overrides.grant, overrides.deny);
  }

  async replacePermissionOverrides(
    tx: DrizzleTx,
    orgId: string,
    membershipId: string,
    grant: readonly string[],
    deny: readonly string[],
  ) {
    await tx
      .delete(membershipPermissionOverrides)
      .where(eq(membershipPermissionOverrides.membershipId, membershipId));
    const values = [
      ...grant.map((permissionKey) => ({ membershipId, orgId, permissionKey, effect: 'grant' as const })),
      ...deny.map((permissionKey) => ({ membershipId, orgId, permissionKey, effect: 'deny' as const })),
    ];
    if (values.length > 0) {
      await tx.insert(membershipPermissionOverrides).values(values);
    }
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

  /** True when the org has any order row (drafts and cancelled ones count: they carry a currency). */
  async orgHasOrders(tx: DrizzleTx, orgId: string): Promise<boolean> {
    const rows = await tx.select({ id: orders.id }).from(orders).where(eq(orders.orgId, orgId)).limit(1);
    return rows.length > 0;
  }

  async setBranchesCurrency(tx: DrizzleTx, orgId: string, currency: string): Promise<void> {
    await tx.update(branches).set({ currency }).where(eq(branches.orgId, orgId));
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

  async activateInvitedMembership(
    tx: DrizzleTx,
    membershipId: string,
    inviteTokenHash: string,
    now: Date,
  ): Promise<boolean> {
    const updated = await tx
      .update(memberships)
      .set({
        status: 'active',
        inviteTokenHash: null,
        inviteExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(memberships.id, membershipId),
          eq(memberships.status, 'invited'),
          eq(memberships.inviteTokenHash, inviteTokenHash),
          gt(memberships.inviteExpiresAt, now),
        ),
      )
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

  async membershipHasBranchAccess(
    tx: DrizzleTx,
    membershipId: string,
    branchId: string,
  ): Promise<boolean> {
    const membership = await this.findMembershipById(tx, membershipId);
    if (!membership) {
      return false;
    }
    if (membership.allBranches) {
      return true;
    }
    const branchIds = await this.listMembershipBranchIds(tx, membershipId);
    return branchIds.includes(branchId);
  }

  async listPinUsersForBranch(tx: DrizzleTx, branchId: string) {
    const result = await tx.execute(sql`
      SELECT
        m.id AS membership_id,
        u.name,
        r.key AS role_key
      FROM memberships m
      INNER JOIN users u ON u.id = m.user_id
      INNER JOIN roles r ON r.id = m.role_id
      WHERE m.status = 'active'::membership_status
        AND m.pin_hash IS NOT NULL
        AND length(m.pin_hash) > 0
        AND (
          m.all_branches = true
          OR EXISTS (
            SELECT 1 FROM membership_branches mb
            WHERE mb.membership_id = m.id AND mb.branch_id = ${branchId}::uuid
          )
        )
      ORDER BY u.name ASC, m.id ASC
    `);
    return result.rows as Array<{
      membership_id: string;
      name: string;
      role_key: string;
    }>;
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

  async listBranchSeatMemberships(tx: DrizzleTx) {
    const memRows = await tx
      .select({
        id: memberships.id,
        status: memberships.status,
        allBranches: memberships.allBranches,
      })
      .from(memberships);
    const linkRows = await tx
      .select({
        membershipId: membershipBranches.membershipId,
        branchId: membershipBranches.branchId,
      })
      .from(membershipBranches);
    const byMembership = new Map<string, string[]>();
    for (const link of linkRows) {
      const list = byMembership.get(link.membershipId) ?? [];
      list.push(link.branchId);
      byMembership.set(link.membershipId, list);
    }
    return memRows.map((m) => ({
      id: m.id,
      status: m.status,
      allBranches: m.allBranches,
      branchIds: byMembership.get(m.id) ?? [],
    }));
  }

  async listActiveBranchIds(tx: DrizzleTx, orgId: string): Promise<string[]> {
    const rows = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.orgId, orgId), eq(branches.isActive, true)));
    return rows.map((r) => r.id);
  }

  async pairPosDevice(tx: DrizzleTx, codeHash: string, keyHash: string, now: Date) {
    const result = await tx.execute(
      sql`SELECT device_id, org_id, branch_id, device_name FROM public.pair_pos_device(${codeHash}, ${keyHash}, ${now.toISOString()}::timestamptz)`,
    );
    const row = result.rows[0] as
      | { device_id: string; org_id: string; branch_id: string; device_name: string }
      | undefined;
    return row
      ? {
          deviceId: row.device_id,
          orgId: row.org_id,
          branchId: row.branch_id,
          deviceName: row.device_name,
        }
      : undefined;
  }

  async resolvePosDevice(tx: DrizzleTx, keyHash: string) {
    const result = await tx.execute(
      sql`SELECT device_id, org_id, branch_id, device_name FROM public.resolve_pos_device(${keyHash})`,
    );
    const row = result.rows[0] as
      | { device_id: string; org_id: string; branch_id: string; device_name: string }
      | undefined;
    return row
      ? {
          deviceId: row.device_id,
          orgId: row.org_id,
          branchId: row.branch_id,
          deviceName: row.device_name,
        }
      : undefined;
  }

  async touchPosDevice(tx: DrizzleTx, deviceId: string, now: Date) {
    await tx.update(posDevices).set({ lastUsedAt: now }).where(eq(posDevices.id, deviceId));
  }

  async insertPosDevice(tx: DrizzleTx, row: typeof posDevices.$inferInsert) {
    const inserted = await tx.insert(posDevices).values(row).returning();
    return firstInsertedRow(inserted);
  }

  async listPosDevices(tx: DrizzleTx) {
    return tx
      .select({ device: posDevices, branchName: branches.name })
      .from(posDevices)
      .innerJoin(
        branches,
        and(eq(branches.id, posDevices.branchId), eq(branches.orgId, posDevices.orgId)),
      )
      .where(sql`${posDevices.status} <> 'revoked'`)
      .orderBy(desc(posDevices.createdAt));
  }

  async findPosDeviceById(tx: DrizzleTx, deviceId: string) {
    const rows = await tx.select().from(posDevices).where(eq(posDevices.id, deviceId)).limit(1);
    return rows[0];
  }

  async revokePosDevice(tx: DrizzleTx, deviceId: string, now: Date) {
    await tx
      .update(posDevices)
      .set({
        status: 'revoked',
        revokedAt: now,
        deviceKeyHash: null,
        pairingCodeHash: null,
        pairingExpiresAt: null,
      })
      .where(eq(posDevices.id, deviceId));
  }
}
