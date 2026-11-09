import { Inject, Injectable } from '@nestjs/common';

import type { CreateCategoryBody, PatchCategoryBody, ReorderBody } from '@app/shared';

import { ConflictError, NotFoundError } from '../../core/errors/app-errors';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg, type DrizzleTx } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';
import { newUuidV7 } from '../../lib/uuid';
import { OrgSettingsService } from '../tenancy/org-settings.service';
import { TenancyRepository } from '../tenancy/tenancy.repository';

import { resolveBranchAvailability } from './branch-availability';
import { validateReorderIds } from './catalog-reorder';
import { mapCategory } from './catalog.mapper';
import { requireLocalizedText } from './catalog-validation';
import { CatalogRepository } from './catalog.repository';
import { CatalogMenuCacheNotifier } from './catalog-menu-cache.notifier';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: CatalogRepository,
    private readonly tenancyRepo: TenancyRepository,
    private readonly orgSettings: OrgSettingsService,
    private readonly menuCache: CatalogMenuCacheNotifier,
  ) {}

  private async mapMany(tx: DrizzleTx, rows: Array<Parameters<typeof mapCategory>[0]>) {
    const branchIds = await this.repo.listCategoryBranchIds(
      tx,
      rows.map((r) => r.id),
    );
    return rows.map((row) => mapCategory(row, branchIds.get(row.id) ?? []));
  }

  list(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.repo.listCategories(tx, ctx.orgId);
      return { items: await this.mapMany(tx, rows) };
    });
  }

  async create(ctx: RequestContext, body: CreateCategoryBody) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      const name = requireLocalizedText(body.name, org);
      const availability = resolveBranchAvailability({
        scope: ctx,
        orgBranchIds: await this.tenancyRepo.listBranchIdsForOrg(tx, ctx.orgId),
        input: body,
        current: null,
      });
      const sortOrder = await this.repo.nextCategorySortOrder(tx, ctx.orgId);
      const row = await this.repo.insertCategory(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        name,
        sortOrder,
        isActive: body.isActive ?? true,
        availableInAllBranches: availability.availableInAllBranches,
      });
      await this.repo.replaceCategoryBranches(tx, row.id, ctx.orgId, availability.branchIds);
      return mapCategory(row, availability.branchIds);
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }

  async patch(ctx: RequestContext, categoryId: string, body: PatchCategoryBody) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      const existing = await this.repo.findCategoryById(tx, categoryId);
      if (!existing) {
        throw new NotFoundError();
      }
      const name = body.name !== undefined ? requireLocalizedText(body.name, org) : undefined;
      const currentBranchIds =
        (await this.repo.listCategoryBranchIds(tx, [categoryId])).get(categoryId) ?? [];
      const touchesBranches =
        body.availableInAllBranches !== undefined || body.branchIds !== undefined;
      const availability = touchesBranches
        ? resolveBranchAvailability({
            scope: ctx,
            orgBranchIds: await this.tenancyRepo.listBranchIdsForOrg(tx, ctx.orgId),
            input: body,
            current: {
              availableInAllBranches: existing.availableInAllBranches,
              branchIds: existing.availableInAllBranches ? [] : currentBranchIds,
            },
          })
        : null;
      const updated = await this.repo.updateCategory(tx, categoryId, {
        name,
        isActive: body.isActive,
        availableInAllBranches: availability?.availableInAllBranches,
      });
      if (!updated) {
        throw new NotFoundError();
      }
      if (availability) {
        await this.repo.replaceCategoryBranches(tx, categoryId, ctx.orgId, availability.branchIds);
      }
      return mapCategory(updated, availability ? availability.branchIds : currentBranchIds);
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }

  async remove(ctx: RequestContext, categoryId: string) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findCategoryById(tx, categoryId);
      if (!existing) {
        throw new NotFoundError();
      }
      const count = await this.repo.countNonDeletedProductsInCategory(tx, categoryId);
      if (count > 0) {
        throw new ConflictError(
          'Category has products',
          { categoryId },
          'CATEGORY_HAS_ACTIVE_PRODUCTS',
        );
      }
      const deleted = await this.repo.softDeleteCategory(tx, categoryId);
      if (!deleted) {
        throw new NotFoundError();
      }
      return (await this.mapMany(tx, [deleted]))[0];
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }

  async reorder(ctx: RequestContext, body: ReorderBody) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const locked = await this.repo.lockActiveCategoriesForUpdate(tx, ctx.orgId);
      const activeIds = locked.map((r) => r.id);
      validateReorderIds(body.orderedIds, activeIds);
      for (let i = 0; i < body.orderedIds.length; i += 1) {
        const id = body.orderedIds[i];
        if (id) {
          await this.repo.setCategorySortOrder(tx, id, i);
        }
      }
      const rows = await this.repo.listCategories(tx, ctx.orgId);
      return { items: await this.mapMany(tx, rows) };
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }
}
