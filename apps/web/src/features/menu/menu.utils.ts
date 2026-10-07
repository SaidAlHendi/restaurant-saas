import { z } from 'zod';

import { currencyDigits, formatMinor } from '@app/ui';

import {
  parseLocalizedText,
  type Category,
  type LocalizedText,
  type Modifier,
  type OrgLocaleContext,
  type Product,
} from '@app/shared';

/** Move `activeId` before `overId` in a list; returns null when unchanged or invalid. */
export function reorderByDrag(
  items: { id: string }[],
  activeId: string,
  overId: string | undefined,
): string[] | null {
  if (!overId || activeId === overId) {
    return null;
  }
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) {
    return null;
  }
  const next = items.map((item) => item.id);
  const [removed] = next.splice(oldIndex, 1);
  if (removed === undefined) {
    return null;
  }
  next.splice(newIndex, 0, removed);
  return next;
}

export function pickLocalizedName(
  name: LocalizedText,
  preferredLocale: string,
  fallbackLocale: string,
): string {
  const primary = name[preferredLocale]?.trim();
  if (primary) {
    return primary;
  }
  const fallback = name[fallbackLocale]?.trim();
  if (fallback) {
    return fallback;
  }
  const first = Object.values(name).find((value) => value.trim().length > 0);
  return first ?? '';
}

/** Form map of locale → string; default locale must be non-empty (matches API localized text rules). */
export function buildLocalizedFormSchema(locales: string[], defaultLocale: string) {
  const localeSet = new Set(locales);
  return z.record(z.string(), z.string()).superRefine((value, ctx) => {
    for (const key of Object.keys(value)) {
      if (!localeSet.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Locale is not enabled for this organization',
          path: [key],
        });
      }
    }
    const defaultVal = value[defaultLocale];
    if (defaultVal === undefined || defaultVal.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Default locale text is required',
        path: [defaultLocale],
      });
    }
  });
}

export function localizedFormToApi(
  values: Record<string, string>,
  org: OrgLocaleContext,
  options: { optional?: boolean } = {},
): LocalizedText {
  const raw: LocalizedText = {};
  for (const locale of org.locales) {
    raw[locale] = values[locale] ?? '';
  }
  return parseLocalizedText(raw, org, options);
}

export function localizedRecordToFormDefaults(
  name: LocalizedText | undefined,
  locales: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of locales) {
    out[locale] = name?.[locale] ?? '';
  }
  return out;
}

export function categoryLabel(category: Category, uiLocale: string, defaultLocale: string): string {
  return pickLocalizedName(category.name, uiLocale, defaultLocale);
}

export function productLabel(product: Product, uiLocale: string, defaultLocale: string): string {
  return pickLocalizedName(product.name, uiLocale, defaultLocale);
}

export function productImagePreviewUrl(product: Product): string | null {
  return product.imageUrls?.url400 ?? null;
}

export function formatModifierPriceDelta(modifier: Modifier, locale: string): string {
  const digits = currencyDigits(modifier.currency);
  const formatted = formatMinor(modifier.priceDeltaMinor, digits, locale);
  if (modifier.priceDeltaMinor === 0) {
    return formatted;
  }
  return modifier.priceDeltaMinor > 0 ? `+${formatted}` : formatted;
}
