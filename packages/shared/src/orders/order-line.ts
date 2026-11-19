import { z } from 'zod';

export const orderLineInputSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(999),
  notes: z.string().trim().max(500).optional(),
  modifierIds: z.array(z.uuid()).default([]),
  /** Guest label on a shared table bill, so the guest can pay for their own items. */
  seat: z.string().trim().min(1).max(24).optional(),
});

export type OrderLineInput = z.infer<typeof orderLineInputSchema>;
