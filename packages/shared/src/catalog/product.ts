import { z } from 'zod';

import { localizedTextInputSchema, moneyMinorSchema } from '../i18n/localized-text.js';
import { cursorListQuerySchema, cursorListResponseSchema } from './pagination.js';
import { modifierGroupSummarySchema } from './modifier-group.js';

export const productImageUrlsSchema = z.object({
  url400: z.url(),
  url800: z.url(),
  url1200: z.url(),
});

export const productSchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  categoryId: z.uuid(),
  name: z.record(z.string(), z.string()),
  description: z.record(z.string(), z.string()).nullable(),
  priceMinor: moneyMinorSchema,
  currency: z.string().length(3),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  imageUrls: productImageUrlsSchema.nullable(),
});

export type Product = z.infer<typeof productSchema>;

export const productDetailSchema = productSchema.extend({
  modifierGroups: z.array(modifierGroupSummarySchema),
});

export type ProductDetail = z.infer<typeof productDetailSchema>;

export const productListQuerySchema = cursorListQuerySchema.extend({
  categoryId: z.uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().trim().min(1).max(200).optional(),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productListResponseSchema = cursorListResponseSchema(productSchema);

export const createProductBodySchema = z.object({
  categoryId: z.uuid(),
  name: localizedTextInputSchema,
  description: localizedTextInputSchema.optional(),
  priceMinor: moneyMinorSchema,
  isActive: z.boolean().optional(),
});

export type CreateProductBody = z.infer<typeof createProductBodySchema>;

export const patchProductBodySchema = z.object({
  categoryId: z.uuid().optional(),
  name: localizedTextInputSchema.optional(),
  description: localizedTextInputSchema.optional(),
  priceMinor: moneyMinorSchema.optional(),
  isActive: z.boolean().optional(),
});

export type PatchProductBody = z.infer<typeof patchProductBodySchema>;

export const reorderProductsBodySchema = z.object({
  categoryId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
});

export type ReorderProductsBody = z.infer<typeof reorderProductsBodySchema>;

export const setProductModifierGroupsBodySchema = z.object({
  groupIds: z.array(z.uuid()),
});

export type SetProductModifierGroupsBody = z.infer<typeof setProductModifierGroupsBodySchema>;
