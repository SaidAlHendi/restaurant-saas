import { Inject, Injectable } from '@nestjs/common';

import type { CreateCategoryBody, PatchCategoryBody, ReorderBody } from '@app/shared';

import { ConflictError, NotFoundError } from '../../core/errors/app-errors';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';
import { newUuidV7 } from '../../lib/uuid';
import { OrgSettingsService } from '../tenancy/org-settings.service';

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
    private readonly orgSettings: OrgSettingsService,
    private readonly menuCache: CatalogMenuCacheNotifier,
  ) {}

  list(ctx: RequestContext) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const rows = await this.repo.listCategories(tx, ctx.orgId);
      return { items: rows.map(mapCategory) };
    });
  }

  async create(ctx: RequestContext, body: CreateCategoryBody) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      const name = requireLocalizedText(body.name, org);
      const sortOrder = await this.repo.nextCategorySortOrder(tx, ctx.orgId);
      const row = await this.repo.insertCategory(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        name,
        sortOrder,
        isActive: body.isActive ?? true,
      });
      return mapCategory(row);
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
      const updated = await this.repo.updateCategory(tx, categoryId, {
        name,
        isActive: body.isActive,
      });
      if (!updated) {
        throw new NotFoundError();
      }
      return mapCategory(updated);
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
      return mapCategory(deleted);
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
      return { items: rows.map(mapCategory) };
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }
}
