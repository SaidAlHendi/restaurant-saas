import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../core/errors/app-errors';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';
import { newUuidV7 } from '../../lib/uuid';
import { slugifyBase, slugWithSuffix } from '../../lib/slug';
import type { CreateBranchBody, PatchBranchBody } from '@app/shared';

import { TenancyRepository } from './tenancy.repository';

@Injectable()
export class BranchesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: TenancyRepository,
  ) {}

  list(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.repo.listBranches(tx, ctx.orgId);
      return {
        items: rows.map((b) => ({
          id: b.id,
          orgId: b.orgId,
          name: b.name,
          slug: b.slug,
          timezone: b.timezone,
          currency: b.currency,
          taxRateBp: b.taxRateBp,
          taxInclusive: b.taxInclusive,
          dayStartHour: b.dayStartHour,
          isActive: b.isActive,
        })),
      };
    });
  }

  async create(ctx: RequestContext, body: CreateBranchBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const base = body.slug ?? (slugifyBase(body.name) || 'branch');
      let slug = base;
      let suffix = 0;
      while (await this.repo.branchSlugExistsInOrg(tx, ctx.orgId, slug)) {
        suffix += 1;
        slug = slugWithSuffix(base, suffix);
      }
      const branch = await this.repo.insertBranch(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        name: body.name,
        slug,
        timezone: body.timezone,
        currency: body.currency,
        taxRateBp: body.taxRateBp,
        taxInclusive: body.taxInclusive,
        dayStartHour: body.dayStartHour,
      });
      return {
        id: branch.id,
        orgId: branch.orgId,
        name: branch.name,
        slug: branch.slug,
        timezone: branch.timezone,
        currency: branch.currency,
        taxRateBp: branch.taxRateBp,
        taxInclusive: branch.taxInclusive,
        dayStartHour: branch.dayStartHour,
        isActive: branch.isActive,
      };
    });
  }

  async patch(ctx: RequestContext, branchId: string, body: PatchBranchBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findBranchById(tx, branchId);
      if (!existing || existing.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }
      const updated = await this.repo.updateBranch(tx, branchId, {
        name: body.name,
        timezone: body.timezone,
        currency: body.currency,
        taxRateBp: body.taxRateBp,
        taxInclusive: body.taxInclusive,
        dayStartHour: body.dayStartHour,
        isActive: body.isActive,
      });
      if (!updated) {
        throw new NotFoundError();
      }
      return {
        id: updated.id,
        orgId: updated.orgId,
        name: updated.name,
        slug: updated.slug,
        timezone: updated.timezone,
        currency: updated.currency,
        taxRateBp: updated.taxRateBp,
        taxInclusive: updated.taxInclusive,
        dayStartHour: updated.dayStartHour,
        isActive: updated.isActive,
      };
    });
  }
}
