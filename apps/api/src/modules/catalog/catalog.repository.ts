import { and, asc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import {
  categories,
  modifierGroups,
  modifiers,
  productModifierGroups,
  products,
} from '../../core/db/schema/catalog';
import type { DrizzleTx } from '../../core/db/with-org';
import { escapeLikePattern } from '../../lib/sql-like';
import type { ProductListCursor } from '../../lib/cursor';

function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Expected row');
  }
  return row;
}

@Injectable()
export class CatalogRepository {
  async listCategories(tx: DrizzleTx, orgId: string) {
    return tx
      .select()
      .from(categories)
      .where(and(eq(categories.orgId, orgId), isNull(categories.deletedAt)))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
  }

  async findCategoryById(tx: DrizzleTx, categoryId: string, includeDeleted = false) {
    const rows = await tx
      .select()
      .from(categories)
      .where(
        includeDeleted
          ? eq(categories.id, categoryId)
          : and(eq(categories.id, categoryId), isNull(categories.deletedAt)),
      )
      .limit(1);
    return rows[0];
  }

  async insertCategory(tx: DrizzleTx, row: typeof categories.$inferInsert) {
    return firstRow(await tx.insert(categories).values(row).returning());
  }

  async updateCategory(tx: DrizzleTx, categoryId: string, patch: Partial<typeof categories.$inferInsert>) {
    const rows = await tx
      .update(categories)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .returning();
    return rows[0];
  }

  async softDeleteCategory(tx: DrizzleTx, categoryId: string) {
    const rows = await tx
      .update(categories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .returning();
    return rows[0];
  }

  async countNonDeletedProductsInCategory(tx: DrizzleTx, categoryId: string) {
    const result = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.categoryId, categoryId), isNull(products.deletedAt)));
    return result[0]?.count ?? 0;
  }

  async lockActiveCategoriesForUpdate(tx: DrizzleTx, orgId: string) {
    return tx
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.orgId, orgId), isNull(categories.deletedAt)))
      .orderBy(asc(categories.sortOrder), asc(categories.id))
      .for('update');
  }

  async setCategorySortOrder(tx: DrizzleTx, categoryId: string, sortOrder: number) {
    await tx
      .update(categories)
      .set({ sortOrder, updatedAt: new Date() })
      .where(eq(categories.id, categoryId));
  }

  async nextCategorySortOrder(tx: DrizzleTx, orgId: string) {
    const result = await tx
      .select({ max: sql<number>`coalesce(max(${categories.sortOrder}), -1)::int` })
      .from(categories)
      .where(and(eq(categories.orgId, orgId), isNull(categories.deletedAt)));
    return (result[0]?.max ?? -1) + 1;
  }

  async countNonDeletedProducts(tx: DrizzleTx, orgId: string) {
    const result = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.orgId, orgId), isNull(products.deletedAt)));
    return result[0]?.count ?? 0;
  }

  async listProducts(
    tx: DrizzleTx,
    orgId: string,
    opts: {
      categoryId?: string;
      isActive?: boolean;
      search?: string;
      cursor?: ProductListCursor;
      limit: number;
    },
  ) {
    const conditions = [eq(products.orgId, orgId), isNull(products.deletedAt)];
    if (opts.categoryId) {
      conditions.push(eq(products.categoryId, opts.categoryId));
    }
    if (opts.isActive !== undefined) {
      conditions.push(eq(products.isActive, opts.isActive));
    }
    if (opts.search) {
      const pattern = `%${escapeLikePattern(opts.search)}%`;
      conditions.push(
        sql`exists (
          select 1 from jsonb_each_text(${products.name}) as kv(key, value)
          where value ilike ${pattern} escape '\\'
        )`,
      );
    }
    if (opts.cursor) {
      conditions.push(
        or(
          gt(products.sortOrder, opts.cursor.sortOrder),
          and(eq(products.sortOrder, opts.cursor.sortOrder), gt(products.id, opts.cursor.id)),
        ) ?? sql`true`,
      );
    }

    return tx
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.sortOrder), asc(products.id))
      .limit(opts.limit + 1);
  }

  async findProductById(tx: DrizzleTx, productId: string, includeDeleted = false) {
    const rows = await tx
      .select()
      .from(products)
      .where(
        includeDeleted
          ? eq(products.id, productId)
          : and(eq(products.id, productId), isNull(products.deletedAt)),
      )
      .limit(1);
    return rows[0];
  }

  async insertProduct(tx: DrizzleTx, row: typeof products.$inferInsert) {
    return firstRow(await tx.insert(products).values(row).returning());
  }

  async updateProduct(tx: DrizzleTx, productId: string, patch: Partial<typeof products.$inferInsert>) {
    const rows = await tx
      .update(products)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .returning();
    return rows[0];
  }

  async softDeleteProduct(tx: DrizzleTx, productId: string) {
    const rows = await tx
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .returning();
    return rows[0];
  }

  async lockActiveProductsInCategoryForUpdate(tx: DrizzleTx, orgId: string, categoryId: string) {
    return tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.orgId, orgId),
          eq(products.categoryId, categoryId),
          isNull(products.deletedAt),
        ),
      )
      .orderBy(asc(products.sortOrder), asc(products.id))
      .for('update');
  }

  async setProductSortOrder(tx: DrizzleTx, productId: string, sortOrder: number) {
    await tx
      .update(products)
      .set({ sortOrder, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }

  async nextProductSortOrderInCategory(tx: DrizzleTx, orgId: string, categoryId: string) {
    const result = await tx
      .select({ max: sql<number>`coalesce(max(${products.sortOrder}), -1)::int` })
      .from(products)
      .where(
        and(
          eq(products.orgId, orgId),
          eq(products.categoryId, categoryId),
          isNull(products.deletedAt),
        ),
      );
    return (result[0]?.max ?? -1) + 1;
  }

  async listModifierGroups(tx: DrizzleTx, orgId: string) {
    return tx
      .select()
      .from(modifierGroups)
      .where(and(eq(modifierGroups.orgId, orgId), isNull(modifierGroups.deletedAt)))
      .orderBy(asc(modifierGroups.id));
  }

  async findModifierGroupById(tx: DrizzleTx, groupId: string, includeDeleted = false) {
    const rows = await tx
      .select()
      .from(modifierGroups)
      .where(
        includeDeleted
          ? eq(modifierGroups.id, groupId)
          : and(eq(modifierGroups.id, groupId), isNull(modifierGroups.deletedAt)),
      )
      .limit(1);
    return rows[0];
  }

  async insertModifierGroup(tx: DrizzleTx, row: typeof modifierGroups.$inferInsert) {
    return firstRow(await tx.insert(modifierGroups).values(row).returning());
  }

  async updateModifierGroup(
    tx: DrizzleTx,
    groupId: string,
    patch: Partial<typeof modifierGroups.$inferInsert>,
  ) {
    const rows = await tx
      .update(modifierGroups)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(modifierGroups.id, groupId), isNull(modifierGroups.deletedAt)))
      .returning();
    return rows[0];
  }

  async softDeleteModifierGroup(tx: DrizzleTx, groupId: string) {
    const rows = await tx
      .update(modifierGroups)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(modifierGroups.id, groupId), isNull(modifierGroups.deletedAt)))
      .returning();
    return rows[0];
  }

  async listModifiersInGroup(tx: DrizzleTx, groupId: string) {
    return tx
      .select()
      .from(modifiers)
      .where(and(eq(modifiers.groupId, groupId), isNull(modifiers.deletedAt)))
      .orderBy(asc(modifiers.sortOrder), asc(modifiers.id));
  }

  async findModifierById(tx: DrizzleTx, modifierId: string, groupId: string) {
    const rows = await tx
      .select()
      .from(modifiers)
      .where(
        and(
          eq(modifiers.id, modifierId),
          eq(modifiers.groupId, groupId),
          isNull(modifiers.deletedAt),
        ),
      )
      .limit(1);
    return rows[0];
  }

  async insertModifier(tx: DrizzleTx, row: typeof modifiers.$inferInsert) {
    return firstRow(await tx.insert(modifiers).values(row).returning());
  }

  async updateModifier(tx: DrizzleTx, modifierId: string, patch: Partial<typeof modifiers.$inferInsert>) {
    const rows = await tx
      .update(modifiers)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(modifiers.id, modifierId), isNull(modifiers.deletedAt)))
      .returning();
    return rows[0];
  }

  async softDeleteModifier(tx: DrizzleTx, modifierId: string) {
    const rows = await tx
      .update(modifiers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(modifiers.id, modifierId), isNull(modifiers.deletedAt)))
      .returning();
    return rows[0];
  }

  async lockActiveModifiersInGroupForUpdate(tx: DrizzleTx, groupId: string) {
    return tx
      .select({ id: modifiers.id })
      .from(modifiers)
      .where(and(eq(modifiers.groupId, groupId), isNull(modifiers.deletedAt)))
      .orderBy(asc(modifiers.sortOrder), asc(modifiers.id))
      .for('update');
  }

  async setModifierSortOrder(tx: DrizzleTx, modifierId: string, sortOrder: number) {
    await tx
      .update(modifiers)
      .set({ sortOrder, updatedAt: new Date() })
      .where(eq(modifiers.id, modifierId));
  }

  async nextModifierSortOrder(tx: DrizzleTx, groupId: string) {
    const result = await tx
      .select({ max: sql<number>`coalesce(max(${modifiers.sortOrder}), -1)::int` })
      .from(modifiers)
      .where(and(eq(modifiers.groupId, groupId), isNull(modifiers.deletedAt)));
    return (result[0]?.max ?? -1) + 1;
  }

  async listProductModifierGroups(tx: DrizzleTx, productId: string) {
    return tx
      .select({
        link: productModifierGroups,
        group: modifierGroups,
      })
      .from(productModifierGroups)
      .innerJoin(modifierGroups, eq(productModifierGroups.groupId, modifierGroups.id))
      .where(
        and(
          eq(productModifierGroups.productId, productId),
          isNull(modifierGroups.deletedAt),
        ),
      )
      .orderBy(asc(productModifierGroups.sortOrder), asc(modifierGroups.id));
  }

  async replaceProductModifierGroups(
    tx: DrizzleTx,
    productId: string,
    orgId: string,
    groupIds: string[],
  ) {
    await tx.delete(productModifierGroups).where(eq(productModifierGroups.productId, productId));
    if (groupIds.length === 0) {
      return;
    }
    await tx.insert(productModifierGroups).values(
      groupIds.map((groupId, index) => ({
        productId,
        groupId,
        orgId,
        sortOrder: index,
      })),
    );
  }

  async findModifierGroupsByIds(tx: DrizzleTx, orgId: string, groupIds: string[]) {
    if (groupIds.length === 0) {
      return [];
    }
    return tx
      .select()
      .from(modifierGroups)
      .where(
        and(
          eq(modifierGroups.orgId, orgId),
          inArray(modifierGroups.id, groupIds),
          isNull(modifierGroups.deletedAt),
        ),
      );
  }
}
