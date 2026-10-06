import { and, eq, sql } from 'drizzle-orm';
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
    await tx.insert(branches).values(row);
    const branch = await this.findBranchById(tx, row.id);
    if (branch) {
      return branch;
    }
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      slug: row.slug,
      timezone: row.timezone,
      currency: row.currency,
      taxRateBp: row.taxRateBp ?? 0,
      taxInclusive: row.taxInclusive ?? false,
      dayStartHour: row.dayStartHour ?? 4,
      address: row.address ?? null,
      receiptHeader: row.receiptHeader ?? null,
      receiptFooter: row.receiptFooter ?? null,
      isActive: row.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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

  async orgSlugExists(tx: DrizzleTx, slug: string): Promise<boolean> {
    const rows = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return rows.length > 0;
  }

  /** Global slug check during signup (uses RLS policy organizations_select_signup_slug). */
  async isOrgSlugTakenForSignup(tx: DrizzleTx, slug: string): Promise<boolean> {
    await tx.execute(sql`SELECT set_config('app.signup_slug_check', 'true', true)`);
    try {
      return await this.orgSlugExists(tx, slug);
    } finally {
      await tx.execute(sql`SELECT set_config('app.signup_slug_check', '', true)`);
    }
  }

  async insertOrganization(tx: DrizzleTx, row: typeof organizations.$inferInsert) {
    await tx.insert(organizations).values(row);
    const org = await this.findOrganizationById(tx, row.id);
    if (org) {
      return org;
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      country: row.country,
      defaultCurrency: row.defaultCurrency,
      defaultLocale: row.defaultLocale,
      locales: row.locales,
      logoKey: row.logoKey ?? null,
      status: row.status ?? 'trial',
      createdAt: new Date(),
    };
  }

  async insertMembership(tx: DrizzleTx, row: typeof memberships.$inferInsert) {
    await tx.insert(memberships).values(row);
    const rows = await tx
      .select()
      .from(memberships)
      .where(eq(memberships.id, row.id))
      .limit(1);
    return rows[0] ?? row;
  }

  async findOrganizationById(tx: DrizzleTx, orgId: string) {
    const rows = await tx.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return rows[0];
  }
}
