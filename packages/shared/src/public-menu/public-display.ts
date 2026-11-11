import { z } from 'zod';

/** One "ready for pickup" entry on the customer-facing display. */
/** The secret token in a Ready screen address (24 random bytes, base64url). */
export const publicDisplayTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);

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
