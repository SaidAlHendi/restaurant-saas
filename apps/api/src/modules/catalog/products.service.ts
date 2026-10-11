import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Express } from 'express';

import {
  assertNoDuplicateIds,
  LocalizedTextValidationError,
  type CreateProductBody,
  type PatchProductBody,
  type ProductListQuery,
  type ReorderProductsBody,
  type SetProductModifierGroupsBody,
} from '@app/shared';

import { NotFoundError, ValidationError } from '../../core/errors/app-errors';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import type { DrizzleTx } from '../../core/db/with-org';
import { withOrg } from '../../core/db/with-org';
import type { RequestContext } from '../../core/context/request-context';
import { decodeProductListCursor, encodeProductListCursor } from '../../lib/cursor';
import { newUuidV7 } from '../../lib/uuid';
import { EntitlementsService } from '../billing/entitlements.service';
import { OrgSettingsService } from '../tenancy/org-settings.service';
import { OBJECT_STORAGE } from '../../core/storage/storage.tokens';
import type { ObjectStorage } from '../../core/storage/object-storage';

import { validateReorderIds } from './catalog-reorder';
import { mapModifierGroup, mapProduct } from './catalog.mapper';
import { optionalLocalizedText, requireLocalizedText } from './catalog-validation';
import { CatalogRepository } from './catalog.repository';
import { CatalogMenuCacheNotifier } from './catalog-menu-cache.notifier';
import { ProductImageService } from './product-image.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: CatalogRepository,
    private readonly orgSettings: OrgSettingsService,
    private readonly entitlements: EntitlementsService,
    private readonly images: ProductImageService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly menuCache: CatalogMenuCacheNotifier,
  ) {}

  private async assertCategoryAvailable(tx: DrizzleTx, categoryId: string) {
    const category = await this.repo.findCategoryById(tx, categoryId);
    if (!category) {
      throw new NotFoundError();
    }
    return category;
  }

  private async buildProductDetail(tx: DrizzleTx, orgId: string, productId: string) {
    const org = await this.orgSettings.getCatalogSettings(tx, orgId);
    const product = await this.repo.findProductById(tx, productId);
    if (!product) {
      throw new NotFoundError();
    }
    const groups = await this.repo.listProductModifierGroups(tx, productId);
    return {
      ...mapProduct(product, org.defaultCurrency, this.storage),
      modifierGroups: groups.map(({ group, link }) =>
        mapModifierGroup(group, link.sortOrder),
      ),
    };
  }

  list(ctx: RequestContext, query: ProductListQuery) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      let cursor;
      if (query.cursor) {
        try {
          cursor = decodeProductListCursor(query.cursor);
        } catch {
          throw new ValidationError('Invalid cursor');
        }
      }
      const rows = await this.repo.listProducts(tx, ctx.orgId, {
        categoryId: query.categoryId,
        isActive: query.isActive,
        search: query.search,
        cursor,
        limit: query.limit,
      });
      const hasMore = rows.length > query.limit;
      const page = hasMore ? rows.slice(0, query.limit) : rows;
      const last = page[page.length - 1];
      const nextCursor =
        hasMore && last
          ? encodeProductListCursor({ sortOrder: last.sortOrder, id: last.id })
          : null;
      return {
        items: page.map((row) => mapProduct(row, org.defaultCurrency, this.storage)),
        nextCursor,
      };
    });
  }

  async get(ctx: RequestContext, productId: string) {
    return withOrg(this.db, ctx.orgId, async (tx) => this.buildProductDetail(tx, ctx.orgId, productId));
  }

  async create(ctx: RequestContext, body: CreateProductBody) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      const name = requireLocalizedText(body.name, org);
      const description =
        body.description !== undefined ? optionalLocalizedText(body.description, org) : null;

      await this.assertCategoryAvailable(tx, body.categoryId);
      const count = await this.repo.countNonDeletedProducts(tx, ctx.orgId);
      await this.entitlements.assertWithinLimit(ctx.orgId, 'limit.products', count + 1);

      const sortOrder = await this.repo.nextProductSortOrderInCategory(
        tx,
        ctx.orgId,
        body.categoryId,
      );
      const row = await this.repo.insertProduct(tx, {
        id: newUuidV7(),
        orgId: ctx.orgId,
        categoryId: body.categoryId,
        name,
        description: description ?? null,
        priceMinor: body.priceMinor,
        isActive: body.isActive ?? true,
        sortOrder,
      });
      return mapProduct(row, org.defaultCurrency, this.storage);
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }

  async patch(ctx: RequestContext, productId: string, body: PatchProductBody) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      const name = body.name !== undefined ? requireLocalizedText(body.name, org) : undefined;
      const description =
        body.description !== undefined ? optionalLocalizedText(body.description, org) : undefined;

      const existing = await this.repo.findProductById(tx, productId);
      if (!existing) {
        throw new NotFoundError();
      }

      let sortOrder: number | undefined;
      if (body.categoryId !== undefined && body.categoryId !== existing.categoryId) {
        await this.assertCategoryAvailable(tx, body.categoryId);
        sortOrder = await this.repo.nextProductSortOrderInCategory(
          tx,
          ctx.orgId,
          body.categoryId,
        );
      }

      const updated = await this.repo.updateProduct(tx, productId, {
        categoryId: body.categoryId,
        name,
        description,
        priceMinor: body.priceMinor,
        isActive: body.isActive,
        sortOrder,
      });
      if (!updated) {
        throw new NotFoundError();
      }
      return mapProduct(updated, org.defaultCurrency, this.storage);
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }

  async remove(ctx: RequestContext, productId: string) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      const deleted = await this.repo.softDeleteProduct(tx, productId);
      if (!deleted) {
        throw new NotFoundError();
      }
      return mapProduct(deleted, org.defaultCurrency, this.storage);
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }

  async reorder(ctx: RequestContext, body: ReorderProductsBody) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      await this.assertCategoryAvailable(tx, body.categoryId);
      const locked = await this.repo.lockActiveProductsInCategoryForUpdate(
        tx,
        ctx.orgId,
        body.categoryId,
      );
      validateReorderIds(body.orderedIds, locked.map((r) => r.id));
      for (let i = 0; i < body.orderedIds.length; i += 1) {
        const id = body.orderedIds[i];
        if (id) {
          await this.repo.setProductSortOrder(tx, id, i);
        }
      }
      const rows = await this.repo.listProducts(tx, ctx.orgId, {
        categoryId: body.categoryId,
        limit: 1000,
      });
      return {
        items: rows.map((row) => mapProduct(row, org.defaultCurrency, this.storage)),
      };
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }

  async setModifierGroups(ctx: RequestContext, productId: string, body: SetProductModifierGroupsBody) {
    try {
      assertNoDuplicateIds(body.groupIds, 'groupIds');
    } catch (err: unknown) {
      if (err instanceof LocalizedTextValidationError) {
        throw new ValidationError(err.message, err.details);
      }
      throw err;
    }

    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const product = await this.repo.findProductById(tx, productId);
      if (!product) {
        throw new NotFoundError();
      }
      if (body.groupIds.length > 0) {
        const groups = await this.repo.findModifierGroupsByIds(tx, ctx.orgId, body.groupIds);
        if (groups.length !== body.groupIds.length) {
          throw new NotFoundError();
        }
      }
      await this.repo.replaceProductModifierGroups(tx, productId, ctx.orgId, body.groupIds);
      return this.buildProductDetail(tx, ctx.orgId, productId);
    });
    this.menuCache.afterCatalogChange(ctx.orgId);
    return result;
  }

  async uploadImage(ctx: RequestContext, productId: string, file: Express.Multer.File) {
    this.images.assertFileSize(file.size);

    const previousPrefix = await withOrg(this.db, ctx.orgId, async (tx) => {
      const product = await this.repo.findProductById(tx, productId);
      if (!product) {
        throw new NotFoundError();
      }
      return product.imageKey;
    });

    let newPrefix: string | null = null;
    try {
      const processed = await this.images.processAndUpload(ctx.orgId, productId, file.buffer);
      newPrefix = processed.prefix;

      const result = await withOrg(this.db, ctx.orgId, async (tx) => {
        const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
        const product = await this.repo.findProductById(tx, productId);
        if (!product) {
          throw new NotFoundError();
        }
        const updated = await this.repo.updateProduct(tx, productId, {
          imageKey: processed.prefix,
        });
        if (!updated) {
          throw new NotFoundError();
        }
        return { updated, org };
      });

      if (previousPrefix && previousPrefix !== newPrefix) {
        try {
          await this.images.deletePrefix(previousPrefix);
        } catch (err: unknown) {
          this.logger.warn(
            { err, previousPrefix, productId, orgId: ctx.orgId },
            'Failed to delete replaced product image files',
          );
        }
      }

      const mapped = mapProduct(result.updated, result.org.defaultCurrency, this.storage);
      this.menuCache.afterCatalogChange(ctx.orgId);
      return mapped;
    } catch (err: unknown) {
      if (newPrefix) {
        try {
          await this.images.deletePrefix(newPrefix);
        } catch (cleanupErr: unknown) {
          this.logger.warn(
            { err: cleanupErr, newPrefix, productId, orgId: ctx.orgId },
            'Failed to roll back new product image files after error',
          );
        }
      }
      throw err;
    }
  }

  async removeImage(ctx: RequestContext, productId: string) {
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(tx, ctx.orgId);
      const product = await this.repo.findProductById(tx, productId);
      if (!product) {
        throw new NotFoundError();
      }
      const previousPrefix = product.imageKey;
      const updated = await this.repo.updateProduct(tx, productId, { imageKey: null });
      if (!updated) {
        throw new NotFoundError();
      }
      return { updated, previousPrefix, org };
    });
    if (result.previousPrefix) {
      try {
        await this.images.deletePrefix(result.previousPrefix);
      } catch (err: unknown) {
        this.logger.warn(
          { err, prefix: result.previousPrefix, productId, orgId: ctx.orgId },
          'Failed to delete product image files after DB clear',
        );
      }
    }
    const mapped = mapProduct(result.updated, result.org.defaultCurrency, this.storage);
    this.menuCache.afterCatalogChange(ctx.orgId);
    return mapped;
  }
}
