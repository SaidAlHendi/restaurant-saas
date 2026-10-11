import type { PosMenuPayload } from '@app/shared';

import type { categories, modifierGroups, modifiers, products } from '../../core/db/schema/catalog';
import type { ObjectStorage } from '../../core/storage/object-storage';

import { mapPosCategory, mapPosProduct } from './pos-menu.mapper';

type CategoryRow = typeof categories.$inferSelect;
type ProductRow = typeof products.$inferSelect;
type ModifierGroupRow = typeof modifierGroups.$inferSelect;
type ModifierRow = typeof modifiers.$inferSelect;

type GroupLinkRow = {
  link: { productId: string; sortOrder: number };
  group: ModifierGroupRow;
};

export function assemblePosMenuCategories(input: {
  categoryRows: CategoryRow[];
  productRows: ProductRow[];
  groupLinkRows: GroupLinkRow[];
  modifierRows: ModifierRow[];
  storage: ObjectStorage;
}): PosMenuPayload['categories'] {
  const productsByCategory = new Map<string, ProductRow[]>();
  for (const row of input.productRows) {
    const list = productsByCategory.get(row.categoryId);
    if (list) {
      list.push(row);
    } else {
      productsByCategory.set(row.categoryId, [row]);
    }
  }

  const linksByProduct = new Map<string, GroupLinkRow[]>();
  for (const row of input.groupLinkRows) {
    const list = linksByProduct.get(row.link.productId);
    if (list) {
      list.push(row);
    } else {
      linksByProduct.set(row.link.productId, [row]);
    }
  }

  const modifiersByGroup = new Map<string, ModifierRow[]>();
  for (const row of input.modifierRows) {
    const list = modifiersByGroup.get(row.groupId);
    if (list) {
      list.push(row);
    } else {
      modifiersByGroup.set(row.groupId, [row]);
    }
  }

  const categoriesOut: PosMenuPayload['categories'] = [];

  for (const categoryRow of input.categoryRows) {
    const categoryProducts = productsByCategory.get(categoryRow.id) ?? [];
    if (categoryProducts.length === 0) {
      continue;
    }

    const productsMapped = categoryProducts.map((productRow) => {
      const links = linksByProduct.get(productRow.id) ?? [];
      const groups = [];
      for (const { group, link } of links) {
        const mods = modifiersByGroup.get(group.id) ?? [];
        if (mods.length === 0) {
          continue;
        }
        groups.push({
          group,
          linkSortOrder: link.sortOrder,
          modifiers: mods,
        });
      }
      return mapPosProduct(productRow, input.storage, groups);
    });

    categoriesOut.push(mapPosCategory(categoryRow, productsMapped));
  }

  return categoriesOut;
}
