import { z } from 'zod';

/** One "ready for pickup" entry on the customer-facing display. */
export const publicDisplayOrderSchema = z.object({
  orderNumber: z.number().int().min(1),
  pagerNumber: z.number().int().min(1).nullable(),
});

export const publicDisplayPayloadSchema = z.object({
  branchName: z.string(),
  orgName: z.string(),
  ready: z.array(publicDisplayOrderSchema),
});

export type PublicDisplayOrder = z.infer<typeof publicDisplayOrderSchema>;
export type PublicDisplayPayload = z.infer<typeof publicDisplayPayloadSchema>;
