import { z } from 'zod';

export const branchSchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  name: z.string(),
  slug: z.string(),
  timezone: z.string(),
  currency: z.string(),
  taxRateBp: z.number().int(),
  taxInclusive: z.boolean(),
  dayStartHour: z.number().int(),
  isActive: z.boolean(),
});

export type Branch = z.infer<typeof branchSchema>;

export const createBranchBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(64).optional(),
  timezone: z.string().trim().min(1).max(64),
  currency: z.string().length(3).toUpperCase(),
  taxRateBp: z.number().int().min(0).default(0),
  taxInclusive: z.boolean().default(false),
  dayStartHour: z.number().int().min(0).max(23).default(4),
});

export type CreateBranchBody = z.infer<typeof createBranchBodySchema>;

export const patchBranchBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  taxRateBp: z.number().int().min(0).optional(),
  taxInclusive: z.boolean().optional(),
  dayStartHour: z.number().int().min(0).max(23).optional(),
  isActive: z.boolean().optional(),
});

export type PatchBranchBody = z.infer<typeof patchBranchBodySchema>;

export const branchListResponseSchema = z.object({
  items: z.array(branchSchema),
});
