import type { OrderRealtimeClientPayload } from '@app/shared';

type OrderTag = { type: 'Order'; id: string };

/**
 * Which Order cache entries a socket event makes stale. Skips events whose version the open
 * orders list already has; an order we have not seen refreshes the list.
 */
export function posOrderTagsForEvent(
  openOrders: ReadonlyArray<{ id: string; version: number }>,
  payload: OrderRealtimeClientPayload,
  branchId: string,
): OrderTag[] {
  if (payload.branchId !== branchId) {
    return [];
  }
  const cached = openOrders.find((o) => o.id === payload.orderId);
  if (cached && cached.version >= payload.version) {
    return [];
  }
  return [
    { type: 'Order', id: payload.orderId },
    { type: 'Order', id: 'LIST' },
  ];
}
