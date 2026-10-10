import type { OrderStatus } from '@app/shared';
import { orderRealtimePayloadSchema } from '@app/shared';

export const ORDER_EVENT_TYPES = {
  placed: 'order.placed',
  statusChanged: 'order.status_changed',
  itemsAdded: 'order.items_added',
  itemVoided: 'order.item_voided',
  cancelled: 'order.cancelled',
} as const;

export const REALTIME_EVENT_TYPES = {
  placed: 'order.placed',
  updated: 'order.updated',
  itemUpdated: 'order.item_updated',
} as const;

export function buildRealtimePayload(input: {
  orderId: string;
  branchId: string;
  status: OrderStatus;
  version: number;
}) {
  return orderRealtimePayloadSchema.parse(input);
}

export function realtimeTypeForOrderEvent(eventType: string): string {
  if (eventType === ORDER_EVENT_TYPES.placed) {
    return REALTIME_EVENT_TYPES.placed;
  }
  if (eventType === ORDER_EVENT_TYPES.itemVoided) {
    return REALTIME_EVENT_TYPES.itemUpdated;
  }
  return REALTIME_EVENT_TYPES.updated;
}
