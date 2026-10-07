import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../core/errors/app-errors';

import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { withUser } from '../../core/db/with-user';
import type { RequestContext } from '../../core/context/request-context';
import { IdentityRepository } from './identity.repository';
import { TenancyRepository } from '../tenancy/tenancy.repository';

@Injectable()
export class MeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly identityRepo: IdentityRepository,
    private readonly tenancyRepo: TenancyRepository,
  ) {}

  async getMe(ctx: RequestContext) {
    const user = await this.db.transaction(async (tx) => this.identityRepo.findUserById(tx, ctx.userId));

    const org = await withOrg(this.db, ctx.orgId, async (tx) =>
      this.tenancyRepo.findOrganizationById(tx, ctx.orgId),
    );

    const { role, branches } = await withOrg(this.db, ctx.orgId, async (tx) => {
      const membership = await this.identityRepo.findMembershipForUserOrg(tx, ctx.userId, ctx.orgId);
      const roleRow = membership
        ? await this.tenancyRepo.findRoleById(tx, membership.roleId)
        : undefined;
      const branchRows = await this.tenancyRepo.listBranches(tx, ctx.orgId);
      const visible = membership?.allBranches
        ? branchRows
        : branchRows.filter((b) => ctx.branchIds.includes(b.id));
      return {
        role: roleRow,
        branches: visible,
      };
    });

    const orgs = await withUser(this.db, ctx.userId, async (tx) => {
      const rows = await this.identityRepo.listActiveMembershipsForUser(tx, ctx.userId);
      return rows.map((r) => ({ id: r.org.id, name: r.org.name, slug: r.org.slug }));
    });

    if (!user || !org || !role) {
      throw new NotFoundError('Authenticated user context is incomplete');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale as 'ar' | 'en',
      },
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        defaultLocale: org.defaultLocale,
        locales: org.locales,
        defaultCurrency: org.defaultCurrency,
      },
      role: {
        id: role.id,
        key: role.key,
        name: role.name,
      },
      permissions: ctx.permissions,
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        isActive: b.isActive,
      })),
      orgs,
      currentBranchId: ctx.currentBranchId ?? null,
    };
  }
}
