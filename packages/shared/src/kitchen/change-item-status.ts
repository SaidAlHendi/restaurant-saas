import { z } from 'zod';

export const changeOrderItemStatusBodySchema = z.object({
  to: z.enum(['ready', 'not_ready']),
  expectedVersion: z.number().int().min(1),
});

export type ChangeOrderItemStatusBody = z.infer<typeof changeOrderItemStatusBodySchema>;
