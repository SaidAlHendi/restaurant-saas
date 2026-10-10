import { z } from 'zod';

import { moneyMinorSchema } from '../i18n/localized-text.js';
import { productImageUrlsSchema } from '../catalog/product.js';

export const publicMenuLocaleSchema = z.enum(['ar', 'en']);

export const publicMenuQuerySchema = z.object({
  locale: publicMenuLocaleSchema.optional(),
});

export type PublicMenuQuery = z.infer<typeof publicMenuQuerySchema>;

export const publicMenuModifierSchema = z.object({
  name: z.string(),
  priceDeltaMinor: moneyMinorSchema,
  sortOrder: z.number().int(),
});

export const publicMenuModifierGroupSchema = z.object({
  name: z.string(),
  minSelect: z.number().int(),
  maxSelect: z.number().int(),
  sortOrder: z.number().int(),
  modifiers: z.array(publicMenuModifierSchema),
});

export const publicMenuProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  priceMinor: moneyMinorSchema,
  currency: z.string().length(3),
  sortOrder: z.number().int(),
  imageUrls: productImageUrlsSchema.nullable(),
  modifierGroups: z.array(publicMenuModifierGroupSchema),
});

export const publicMenuCategorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  sortOrder: z.number().int(),
  products: z.array(publicMenuProductSchema),
});

export const publicMenuBranchSchema = z.object({
  name: z.string(),
  slug: z.string(),
  address: z.string().nullable(),
});

export const publicMenuOrgSchema = z.object({
  name: z.string(),
  slug: z.string(),
  defaultLocale: z.string(),
  locales: z.array(z.string()),
  currency: z.string().length(3),
  logoUrl: z.url().nullable(),
});

export const publicMenuPayloadSchema = z.object({
  org: publicMenuOrgSchema,
  branches: z.array(publicMenuBranchSchema),
  categories: z.array(publicMenuCategorySchema),
  branch: publicMenuBranchSchema.optional(),
  poweredBy: z.boolean().optional(),
  effectiveLocale: publicMenuLocaleSchema,
});

export type PublicMenuPayload = z.infer<typeof publicMenuPayloadSchema>;

export const publicTablePayloadSchema = z.object({
  orgSlug: z.string(),
  branchSlug: z.string(),
  tableLabel: z.string(),
  defaultLocale: z.string(),
});

export type PublicTablePayload = z.infer<typeof publicTablePayloadSchema>;

export const publicSitemapEntrySchema = z.object({
  slug: z.string(),
  defaultLocale: z.string(),
  locales: z.array(z.string()),
});

export const publicSitemapResponseSchema = z.object({
  items: z.array(publicSitemapEntrySchema),
});

export type PublicSitemapResponse = z.infer<typeof publicSitemapResponseSchema>;
