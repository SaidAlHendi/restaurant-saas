import type { LocalizedText } from '@app/shared';

import {
  imageUrlsFromPrefix,
  type ObjectStorage,
} from '../../core/storage/object-storage';
import type {
  categories,
  modifierGroups,
  modifiers,
  products,
} from '../../core/db/schema/catalog';

type CategoryRow = typeof categories.$inferSelect;
type ProductRow = typeof products.$inferSelect;
type ModifierGroupRow = typeof modifierGroups.$inferSelect;
type ModifierRow = typeof modifiers.$inferSelect;

function asLocalizedText(value: unknown): LocalizedText {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const out: LocalizedText = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string') {
        out[k] = v;
      }
    }
    return out;
  }
  return {};
}

export function mapCategory(row: CategoryRow) {
  return {
    id: row.id,
    orgId: row.orgId,
    name: asLocalizedText(row.name),
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function mapProduct(row: ProductRow, currency: string, storage: ObjectStorage) {
  return {
    id: row.id,
    orgId: row.orgId,
    categoryId: row.categoryId,
    name: asLocalizedText(row.name),
    description: row.description === null ? null : asLocalizedText(row.description),
    priceMinor: row.priceMinor,
    currency,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    imageUrls: imageUrlsFromPrefix(storage, row.imageKey),
  };
}

export function mapModifierGroup(row: ModifierGroupRow, sortOrder?: number) {
  const base = {
    id: row.id,
    orgId: row.orgId,
    name: asLocalizedText(row.name),
    minSelect: row.minSelect,
    maxSelect: row.maxSelect,
  };
  if (sortOrder !== undefined) {
    return { ...base, sortOrder };
  }
  return base;
}

export function mapModifier(row: ModifierRow, currency: string) {
  return {
    id: row.id,
    orgId: row.orgId,
    groupId: row.groupId,
    name: asLocalizedText(row.name),
    priceDeltaMinor: row.priceDeltaMinor,
    currency,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}
