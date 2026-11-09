import { z } from 'zod';

import { localizedTextInputSchema } from '../i18n/localized-text.js';
import {
  BRANCH_AVAILABILITY_INPUT_MESSAGE,
  branchAvailabilityFields,
  branchAvailabilityInputFields,
  branchAvailabilityInputValid,
} from './branch-availability.js';

export const categorySchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  name: z.record(z.string(), z.string()),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  ...branchAvailabilityFields,
});

export type Category = z.infer<typeof categorySchema>;

export const categoryListResponseSchema = z.object({
  items: z.array(categorySchema),
});

export const createCategoryBodySchema = z
  .object({
    name: localizedTextInputSchema,
    isActive: z.boolean().optional(),
    ...branchAvailabilityInputFields,
  })
  .refine(branchAvailabilityInputValid, {
    message: BRANCH_AVAILABILITY_INPUT_MESSAGE,
    path: ['branchIds'],
  });

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;

export const patchCategoryBodySchema = z
  .object({
    name: localizedTextInputSchema.optional(),
    isActive: z.boolean().optional(),
    ...branchAvailabilityInputFields,
  })
  .refine(branchAvailabilityInputValid, {
    message: BRANCH_AVAILABILITY_INPUT_MESSAGE,
    path: ['branchIds'],
  });

export type PatchCategoryBody = z.infer<typeof patchCategoryBodySchema>;

export const reorderBodySchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

export type ReorderBody = z.infer<typeof reorderBodySchema>;
