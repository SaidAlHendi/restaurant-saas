import { z } from 'zod';

import { localizedTextInputSchema, moneyMinorSchema } from '../i18n/localized-text.js';

export const modifierSchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  groupId: z.uuid(),
  name: z.record(z.string(), z.string()),
  priceDeltaMinor: moneyMinorSchema,
  currency: z.string().length(3),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});

export type Modifier = z.infer<typeof modifierSchema>;

export const modifierGroupSchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  name: z.record(z.string(), z.string()),
  minSelect: z.number().int().min(0),
  maxSelect: z.number().int().min(1),
});

export type ModifierGroup = z.infer<typeof modifierGroupSchema>;

export const modifierGroupDetailSchema = modifierGroupSchema.extend({
  modifiers: z.array(modifierSchema),
});

export type ModifierGroupDetail = z.infer<typeof modifierGroupDetailSchema>;

/** Attached to a product (no nested modifiers). */
export const modifierGroupSummarySchema = modifierGroupSchema.extend({
  sortOrder: z.number().int(),
});

export const modifierGroupListResponseSchema = z.object({
  items: z.array(modifierGroupSchema),
});

export const createModifierGroupBodySchema = z
  .object({
    name: localizedTextInputSchema,
    minSelect: z.number().int().min(0).default(0),
    maxSelect: z.number().int().min(1),
  })
  .refine((v) => v.minSelect <= v.maxSelect, {
    message: 'minSelect must be less than or equal to maxSelect',
    path: ['minSelect'],
  });

export type CreateModifierGroupBody = z.infer<typeof createModifierGroupBodySchema>;

export const patchModifierGroupBodySchema = z
  .object({
    name: localizedTextInputSchema.optional(),
    minSelect: z.number().int().min(0).optional(),
    maxSelect: z.number().int().min(1).optional(),
  })
  .refine(
    (v) => {
      if (v.minSelect !== undefined && v.maxSelect !== undefined) {
        return v.minSelect <= v.maxSelect;
      }
      return true;
    },
    { message: 'minSelect must be less than or equal to maxSelect', path: ['minSelect'] },
  );

export type PatchModifierGroupBody = z.infer<typeof patchModifierGroupBodySchema>;

export const createModifierBodySchema = z.object({
  name: localizedTextInputSchema,
  priceDeltaMinor: moneyMinorSchema.default(0),
  isActive: z.boolean().optional(),
});

export type CreateModifierBody = z.infer<typeof createModifierBodySchema>;

export const patchModifierBodySchema = z.object({
  name: localizedTextInputSchema.optional(),
  priceDeltaMinor: moneyMinorSchema.optional(),
  isActive: z.boolean().optional(),
});

export type PatchModifierBody = z.infer<typeof patchModifierBodySchema>;

export const reorderModifiersBodySchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

export type ReorderModifiersBody = z.infer<typeof reorderModifiersBodySchema>;
