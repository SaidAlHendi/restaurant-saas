import { Inject, Injectable } from '@nestjs/common';

import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';

import { TenancyRepository } from './tenancy.repository';

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: TenancyRepository,
  ) {}

  list(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.repo.listMembershipsWithUsers(tx);
      const items = await Promise.all(
        rows.map(async (row) => {
          const branchIds = row.membership.allBranches
            ? []
            : await this.repo.listMembershipBranchIds(tx, row.membership.id);
          return {
            id: row.membership.id,
            userId: row.user.id,
            userEmail: row.user.email,
            userName: row.user.name,
            roleKey: row.role.key,
            roleName: row.role.name,
            status: row.membership.status,
            allBranches: row.membership.allBranches,
            branchIds,
          };
        }),
      );
      return { items };
    });
  }
}
