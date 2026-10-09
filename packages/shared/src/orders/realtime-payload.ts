import { z } from 'zod';

import { orderStatusSchema } from './enums.js';

export const orderRealtimePayloadSchema = z.object({
  orderId: z.uuid(),
  branchId: z.uuid(),
  status: orderStatusSchema,
  version: z.number().int().min(1),
});

export type OrderRealtimePayload = z.infer<typeof orderRealtimePayloadSchema>;
