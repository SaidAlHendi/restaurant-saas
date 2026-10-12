import { z } from 'zod';

import { isValidIanaTimezone } from './timezone.js';

const nullableTrimmedText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional();

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
  address: z.string().nullable(),
  receiptHeader: z.string().nullable(),
  receiptFooter: z.string().nullable(),
  payBeforeSend: z.boolean(),
  acceptsCard: z.boolean(),
  isActive: z.boolean(),
});

export type Branch = z.infer<typeof branchSchema>;

export const createBranchBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(64).optional(),
  timezone: z.string().trim().min(1).max(64).refine(isValidIanaTimezone, 'Invalid timezone'),
  currency: z.string().length(3).toUpperCase(),
  taxRateBp: z.number().int().min(0).max(10000).default(0),
  taxInclusive: z.boolean().default(false),
  dayStartHour: z.number().int().min(0).max(23).default(4),
});

export type CreateBranchBody = z.infer<typeof createBranchBodySchema>;

export const patchBranchBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine(isValidIanaTimezone, 'Invalid timezone')
    .optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  taxRateBp: z.number().int().min(0).max(10000).optional(),
  taxInclusive: z.boolean().optional(),
  dayStartHour: z.number().int().min(0).max(23).optional(),
  address: nullableTrimmedText(300),
  receiptHeader: nullableTrimmedText(500),
  receiptFooter: nullableTrimmedText(500),
  payBeforeSend: z.boolean().optional(),
  acceptsCard: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type PatchBranchBody = z.infer<typeof patchBranchBodySchema>;

export const branchListResponseSchema = z.object({
  items: z.array(branchSchema),
});
