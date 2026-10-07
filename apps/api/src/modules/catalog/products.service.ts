import { Inject, Injectable } from '@nestjs/common';
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
import { ProductImageService } from './product-image.service';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly repo: CatalogRepository,
    private readonly orgSettings: OrgSettingsService,
    private readonly entitlements: EntitlementsService,
    private readonly images: ProductImageService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  private async assertCategoryAvailable(tx: Parameters<CatalogRepository['findCategoryById']>[0], categoryId: string) {
    const category = await this.repo.findCategoryById(tx, categoryId);
    if (!category) {
      throw new NotFoundError();
    }
    return category;
  }

  list(ctx: RequestContext, query: ProductListQuery) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
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
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
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
    });
  }

  async create(ctx: RequestContext, body: CreateProductBody) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    const name = requireLocalizedText(body.name, org);
    const description =
      body.description !== undefined ? optionalLocalizedText(body.description, org) : null;

    return withOrg(this.db, ctx.orgId, async (tx) => {
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
  }

  async patch(ctx: RequestContext, productId: string, body: PatchProductBody) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    const name = body.name !== undefined ? requireLocalizedText(body.name, org) : undefined;
    const description =
      body.description !== undefined ? optionalLocalizedText(body.description, org) : undefined;

    return withOrg(this.db, ctx.orgId, async (tx) => {
      const existing = await this.repo.findProductById(tx, productId);
      if (!existing) {
        throw new NotFoundError();
      }
      if (body.categoryId !== undefined) {
        await this.assertCategoryAvailable(tx, body.categoryId);
      }
      const updated = await this.repo.updateProduct(tx, productId, {
        categoryId: body.categoryId,
        name,
        description,
        priceMinor: body.priceMinor,
        isActive: body.isActive,
      });
      if (!updated) {
        throw new NotFoundError();
      }
      return mapProduct(updated, org.defaultCurrency, this.storage);
    });
  }

  async remove(ctx: RequestContext, productId: string) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const deleted = await this.repo.softDeleteProduct(tx, productId);
      if (!deleted) {
        throw new NotFoundError();
      }
      return mapProduct(deleted, org.defaultCurrency, this.storage);
    });
  }

  async reorder(ctx: RequestContext, body: ReorderProductsBody) {
    return withOrg(this.db, ctx.orgId, async (tx) => {
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
      const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
      const rows = await this.repo.listProducts(tx, ctx.orgId, {
        categoryId: body.categoryId,
        limit: 1000,
      });
      return {
        items: rows.map((row) => mapProduct(row, org.defaultCurrency, this.storage)),
      };
    });
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

    return withOrg(this.db, ctx.orgId, async (tx) => {
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
      return this.get(ctx, productId);
    });
  }

  async uploadImage(ctx: RequestContext, productId: string, file: Express.Multer.File) {
    this.images.assertFileSize(file.size);
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);

    let writtenPrefix: string | null = null;
    let writtenKeys: string[] = [];
    try {
      const processed = await this.images.processAndUpload(ctx.orgId, productId, file.buffer);
      writtenPrefix = processed.prefix;
      writtenKeys = processed.keys;

      const result = await withOrg(this.db, ctx.orgId, async (tx) => {
        const product = await this.repo.findProductById(tx, productId);
        if (!product) {
          throw new NotFoundError();
        }
        const previousPrefix = product.imageKey;
        const updated = await this.repo.updateProduct(tx, productId, {
          imageKey: processed.prefix,
        });
        if (!updated) {
          throw new NotFoundError();
        }
        return { updated, previousPrefix };
      });

      if (result.previousPrefix) {
        await this.images.deletePrefix(result.previousPrefix);
      }
      return mapProduct(result.updated, org.defaultCurrency, this.storage);
    } catch (err: unknown) {
      if (writtenKeys.length > 0 && writtenPrefix) {
        await this.images.deletePrefix(writtenPrefix);
      }
      throw err;
    }
  }

  async removeImage(ctx: RequestContext, productId: string) {
    const org = await this.orgSettings.getCatalogSettings(ctx.orgId);
    const result = await withOrg(this.db, ctx.orgId, async (tx) => {
      const product = await this.repo.findProductById(tx, productId);
      if (!product) {
        throw new NotFoundError();
      }
      const previousPrefix = product.imageKey;
      const updated = await this.repo.updateProduct(tx, productId, { imageKey: null });
      if (!updated) {
        throw new NotFoundError();
      }
      return { updated, previousPrefix };
    });
    if (result.previousPrefix) {
      await this.images.deletePrefix(result.previousPrefix);
    }
    return mapProduct(result.updated, org.defaultCurrency, this.storage);
  }
}
