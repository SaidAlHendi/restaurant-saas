import { z } from 'zod';

import { orderStatusSchema } from './enums.js';

export const orderRealtimeChangeSchema = z.enum([
  'placed',
  'status',
  'items_added',
  'item_voided',
  'item_status',
  'cancelled',
  'payment',
]);

export type OrderRealtimeChange = z.infer<typeof orderRealtimeChangeSchema>;

/** Outbox / server payloads always include `change`. */
export const orderRealtimePayloadSchema = z.object({
  orderId: z.uuid(),
  branchId: z.uuid(),
  status: orderStatusSchema,
  version: z.number().int().min(1),
  change: orderRealtimeChangeSchema,
});

export type OrderRealtimePayload = z.infer<typeof orderRealtimePayloadSchema>;

/** Client socket events may omit `change` on older rows — treat as `status`. */
export const orderRealtimeClientPayloadSchema = orderRealtimePayloadSchema.extend({
  change: orderRealtimeChangeSchema.optional(),
});

export type OrderRealtimeClientPayload = z.infer<typeof orderRealtimeClientPayloadSchema>;

export function normalizeOrderRealtimeChange(
  payload: OrderRealtimeClientPayload,
): OrderRealtimeChange {
  return payload.change ?? 'status';
}
