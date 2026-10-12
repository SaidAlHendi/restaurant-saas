import { Inject, Injectable } from '@nestjs/common';

import { BusinessRuleError, NotFoundError } from '../../core/errors/app-errors';
import { outboxEvents } from '../../core/db/schema/infra';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg, type DrizzleTx } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';
import { newUuidV7 } from '../../lib/uuid';
import { slugifyBase, slugWithSuffix } from '../../lib/slug';
import type { Branch, CreateBranchBody, PatchBranchBody } from '@app/shared';

import { OUTBOX_BRANCH_SETTINGS_UPDATED } from './tenancy.constants';
import { TenancyRepository } from './tenancy.repository';
import { OrgSettingsService } from './org-settings.service';

function mapBranchRow(b: {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  taxRateBp: number;
  taxInclusive: boolean;
  dayStartHour: number;
  address: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  payBeforeSend: boolean;
  acceptsCard: boolean;
  isActive: boolean;
}): Branch {
  return {
    id: b.id,
    orgId: b.orgId,
    name: b.name,
    slug: b.slug,
    timezone: b.timezone,
    currency: b.currency,
    taxRateBp: b.taxRateBp,
    taxInclusive: b.taxInclusive,
    dayStartHour: b.dayStartHour,
    address: b.address,
    receiptHeader: b.receiptHeader,
    receiptFooter: b.receiptFooter,
    payBeforeSend: b.payBeforeSend,
    acceptsCard: b.acceptsCard,
    isActive: b.isActive,
  };
}

@Injectable()
export class BranchesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: TenancyRepository,
    private readonly orgSettings: OrgSettingsService,
  ) {}

  list(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.repo.listBranches(tx, ctx.orgId);
      return {
        items: rows.map((b) => mapBranchRow(b)),
      };
    });
  }

  async create(ctx: RequestContext, body: CreateBranchBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      await this.assertBranchCurrencyMatchesOrg(tx, ctx.orgId, body.currency);
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
      return mapBranchRow(branch);
    });
  }

  async patch(ctx: RequestContext, branchId: string, body: PatchBranchBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findBranchById(tx, branchId);
      if (!existing || existing.orgId !== ctx.orgId) {
        throw new NotFoundError();
      }
      if (body.currency !== undefined) {
        await this.assertBranchCurrencyMatchesOrg(tx, ctx.orgId, body.currency);
      }
      const updated = await this.repo.updateBranch(tx, branchId, {
        name: body.name,
        timezone: body.timezone,
        currency: body.currency,
        taxRateBp: body.taxRateBp,
        taxInclusive: body.taxInclusive,
        dayStartHour: body.dayStartHour,
        address: body.address,
        receiptHeader: body.receiptHeader,
        receiptFooter: body.receiptFooter,
        payBeforeSend: body.payBeforeSend,
        acceptsCard: body.acceptsCard,
        isActive: body.isActive,
      });
      if (!updated) {
        throw new NotFoundError();
      }

      await tx.insert(outboxEvents).values({
        id: newUuidV7(),
        orgId: ctx.orgId,
        branchId,
        type: OUTBOX_BRANCH_SETTINGS_UPDATED,
        aggregateId: branchId,
        payload: { branchId },
      });

      return mapBranchRow(updated);
    });
  }

  private async assertBranchCurrencyMatchesOrg(
    tx: DrizzleTx,
    orgId: string,
    currency: string,
  ): Promise<void> {
    const org = await this.orgSettings.getCatalogSettings(tx, orgId);
    if (currency !== org.defaultCurrency) {
      throw new BusinessRuleError(
        'BRANCH_CURRENCY_MISMATCH',
        'Branch currency must match the organization default currency',
        { branchCurrency: currency, orgCurrency: org.defaultCurrency },
      );
    }
  }
}
