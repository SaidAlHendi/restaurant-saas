import { Inject, Injectable } from '@nestjs/common';

import type { PosMenuPayload } from '@app/shared';

import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import { NotFoundError } from '../../core/errors/app-errors';
import type { ObjectStorage } from '../../core/storage/object-storage';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import type { RequestContext } from '../../core/context/request-context';
import { TenancyRepository } from '../tenancy/tenancy.repository';

import { assemblePosMenuCategories } from './pos-menu.assemble';
import { logoUrlFromKey } from './pos-menu.mapper';
import { CatalogRepository } from './catalog.repository';

@Injectable()
export class PosMenuService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly catalogRepo: CatalogRepository,
    private readonly tenancyRepo: TenancyRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  getMenu(ctx: RequestContext, branchId: string): Promise<PosMenuPayload> {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const branch = await this.tenancyRepo.findBranchById(tx, branchId);
      if (!branch || branch.orgId !== ctx.orgId || !branch.isActive) {
        throw new NotFoundError();
      }

      const org = await this.tenancyRepo.findOrganizationById(tx, ctx.orgId);
      if (!org) {
        throw new NotFoundError();
      }

      const categoryRows = await this.catalogRepo.listActiveCategoriesForPosMenu(tx, ctx.orgId);
      const categoryIds = categoryRows.map((c) => c.id);
      const productRows = await this.catalogRepo.listActiveProductsForCategoryIds(
        tx,
        ctx.orgId,
        categoryIds,
      );
      const productIds = productRows.map((p) => p.id);
      const groupLinkRows = await this.catalogRepo.listProductModifierGroupsForProductIds(
        tx,
        productIds,
      );
      const groupIds = [...new Set(groupLinkRows.map((r) => r.group.id))];
      const modifierRows = await this.catalogRepo.listActiveModifiersForGroupIds(tx, groupIds);

      const categories = assemblePosMenuCategories({
        categoryRows,
        productRows,
        groupLinkRows: groupLinkRows.map((r) => ({
          link: { productId: r.link.productId, sortOrder: r.link.sortOrder },
          group: r.group,
        })),
        modifierRows,
        storage: this.storage,
      });

      return {
        branch: {
          id: branch.id,
          name: branch.name,
          currency: branch.currency,
          taxRateBp: branch.taxRateBp,
          taxInclusive: branch.taxInclusive,
          timezone: branch.timezone,
          receiptHeader: branch.receiptHeader,
          receiptFooter: branch.receiptFooter,
          address: branch.address,
          payBeforeSend: branch.payBeforeSend,
          acceptsCard: branch.acceptsCard,
        },
        org: {
          name: org.name,
          logoUrl: logoUrlFromKey(this.storage, org.logoKey),
        },
        categories,
      };
    });
  }
}
