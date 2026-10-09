import { z } from 'zod';

export const diningTableSchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  branchId: z.uuid(),
  label: z.string(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const diningTableWithTokenSchema = diningTableSchema.extend({
  qrToken: z.string(),
});

export const createDiningTableBodySchema = z.object({
  label: z.string().trim().min(1).max(50),
});

export const patchDiningTableBodySchema = z.object({
  label: z.string().trim().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

export const diningTableListResponseSchema = z.object({
  items: z.array(diningTableSchema),
});

export type DiningTable = z.infer<typeof diningTableSchema>;
export type DiningTableWithToken = z.infer<typeof diningTableWithTokenSchema>;
export type CreateDiningTableBody = z.infer<typeof createDiningTableBodySchema>;
export type PatchDiningTableBody = z.infer<typeof patchDiningTableBodySchema>;
