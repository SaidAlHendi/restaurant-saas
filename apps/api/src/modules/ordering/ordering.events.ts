import type { OrderRealtimeChange, OrderStatus } from '@app/shared';
import { orderRealtimePayloadSchema } from '@app/shared';

export const ORDER_EVENT_TYPES = {
  drafted: 'order.drafted',
  placed: 'order.placed',
  statusChanged: 'order.status_changed',
  itemsAdded: 'order.items_added',
  itemVoided: 'order.item_voided',
  itemStatusChanged: 'order.item_status_changed',
  cancelled: 'order.cancelled',
  paymentCaptured: 'payment.captured',
} as const;

export const REALTIME_EVENT_TYPES = {
  placed: 'order.placed',
  updated: 'order.updated',
  itemUpdated: 'order.item_updated',
} as const;

export function changeForOrderEvent(eventType: string): OrderRealtimeChange {
  switch (eventType) {
    case ORDER_EVENT_TYPES.drafted:
      return 'status';
    case ORDER_EVENT_TYPES.placed:
      return 'placed';
    case ORDER_EVENT_TYPES.itemsAdded:
      return 'items_added';
    case ORDER_EVENT_TYPES.itemVoided:
      return 'item_voided';
    case ORDER_EVENT_TYPES.itemStatusChanged:
      return 'item_status';
    case ORDER_EVENT_TYPES.cancelled:
      return 'cancelled';
    case ORDER_EVENT_TYPES.paymentCaptured:
      return 'payment';
    case ORDER_EVENT_TYPES.statusChanged:
      return 'status';
    default:
      return 'status';
  }
}

export function buildRealtimePayload(input: {
  orderId: string;
  branchId: string;
  status: OrderStatus;
  version: number;
  change: OrderRealtimeChange;
}) {
  return orderRealtimePayloadSchema.parse(input);
}

export function realtimeTypeForOrderEvent(eventType: string): string {
  if (eventType === ORDER_EVENT_TYPES.placed) {
    return REALTIME_EVENT_TYPES.placed;
  }
  if (
    eventType === ORDER_EVENT_TYPES.itemVoided ||
    eventType === ORDER_EVENT_TYPES.itemStatusChanged
  ) {
    return REALTIME_EVENT_TYPES.itemUpdated;
  }
  return REALTIME_EVENT_TYPES.updated;
}
