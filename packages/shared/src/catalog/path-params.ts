import { z } from 'zod';

/** Validates catalog entity ids from URL path segments (UUID v4+). */
export const catalogPathIdSchema = z.uuid();

export const categoryIdParamSchema = z.object({
  categoryId: catalogPathIdSchema,
});

export const productIdParamSchema = z.object({
  productId: catalogPathIdSchema,
});

export const modifierGroupIdParamSchema = z.object({
  groupId: catalogPathIdSchema,
});

export const modifierIdParamSchema = z.object({
  modifierId: catalogPathIdSchema,
});

export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type ModifierGroupIdParam = z.infer<typeof modifierGroupIdParamSchema>;
export type ModifierIdParam = z.infer<typeof modifierIdParamSchema>;
