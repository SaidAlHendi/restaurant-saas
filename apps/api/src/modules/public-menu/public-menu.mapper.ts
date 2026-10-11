import type { LocalizedText, PublicMenuPayload } from '@app/shared';
import { pickLocalizedText } from '@app/shared';

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

export function mapPublicProduct(
  row: ProductRow,
  currency: string,
  locale: string,
  defaultLocale: string,
  storage: ObjectStorage,
  groups: Array<{
    group: ModifierGroupRow;
    linkSortOrder: number;
    modifiers: ModifierRow[];
  }>,
): PublicMenuPayload['categories'][number]['products'][number] {
  const nameMap = asLocalizedText(row.name);
  const descriptionRaw = row.description === null ? null : asLocalizedText(row.description);
  return {
    id: row.id,
    name: pickLocalizedText(nameMap, locale, defaultLocale),
    description:
      descriptionRaw === null
        ? null
        : pickLocalizedText(descriptionRaw, locale, defaultLocale) || null,
    priceMinor: row.priceMinor,
    currency,
    sortOrder: row.sortOrder,
    imageUrls: imageUrlsFromPrefix(storage, row.imageKey),
    modifierGroups: groups.map(({ group, linkSortOrder, modifiers: mods }) => ({
      name: pickLocalizedText(asLocalizedText(group.name), locale, defaultLocale),
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      sortOrder: linkSortOrder,
      modifiers: mods.map((m) => ({
        name: pickLocalizedText(asLocalizedText(m.name), locale, defaultLocale),
        priceDeltaMinor: m.priceDeltaMinor,
        sortOrder: m.sortOrder,
      })),
    })),
  };
}

export function mapPublicCategory(
  row: CategoryRow,
  locale: string,
  defaultLocale: string,
  productsMapped: PublicMenuPayload['categories'][number]['products'],
): PublicMenuPayload['categories'][number] {
  return {
    id: row.id,
    name: pickLocalizedText(asLocalizedText(row.name), locale, defaultLocale),
    sortOrder: row.sortOrder,
    products: productsMapped,
  };
}

export function logoUrlFromKey(storage: ObjectStorage, logoKey: string | null | undefined): string | null {
  if (!logoKey) {
    return null;
  }
  return storage.publicUrl(logoKey);
}
