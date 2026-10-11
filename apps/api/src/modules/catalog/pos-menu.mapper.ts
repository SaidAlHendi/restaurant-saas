import type { LocalizedText, PosMenuPayload } from '@app/shared';

import {
  imageUrlsFromPrefix,
  type ObjectStorage,
} from '../../core/storage/object-storage';
import type { categories, modifierGroups, modifiers, products } from '../../core/db/schema/catalog';

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

export function logoUrlFromKey(storage: ObjectStorage, logoKey: string | null | undefined): string | null {
  if (!logoKey) {
    return null;
  }
  return storage.publicUrl(logoKey);
}

function imageUrl400(storage: ObjectStorage, imageKey: string | null): string | null {
  const urls = imageUrlsFromPrefix(storage, imageKey);
  return urls?.url400 ?? null;
}

export function mapPosProduct(
  row: ProductRow,
  storage: ObjectStorage,
  groups: Array<{
    group: ModifierGroupRow;
    linkSortOrder: number;
    modifiers: ModifierRow[];
  }>,
): PosMenuPayload['categories'][number]['products'][number] {
  const descriptionRaw = row.description === null ? null : asLocalizedText(row.description);
  return {
    id: row.id,
    name: asLocalizedText(row.name),
    description: descriptionRaw,
    priceMinor: row.priceMinor,
    imageUrl400: imageUrl400(storage, row.imageKey),
    sortOrder: row.sortOrder,
    modifierGroups: groups.map(({ group, linkSortOrder, modifiers: mods }) => ({
      id: group.id,
      name: asLocalizedText(group.name),
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      sort: linkSortOrder,
      modifiers: mods.map((m) => ({
        id: m.id,
        name: asLocalizedText(m.name),
        priceDeltaMinor: m.priceDeltaMinor,
        sortOrder: m.sortOrder,
      })),
    })),
  };
}

export function mapPosCategory(
  row: CategoryRow,
  productsMapped: PosMenuPayload['categories'][number]['products'],
): PosMenuPayload['categories'][number] {
  return {
    id: row.id,
    name: asLocalizedText(row.name),
    sortOrder: row.sortOrder,
    products: productsMapped,
  };
}
