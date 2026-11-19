import type { OrderDetail, OrderItem } from '@app/shared';

export function activeOrderItems(order: OrderDetail): OrderItem[] {
  return order.items.filter((item) => item.status !== 'voided');
}

/** Items present in `after` that were not in `before` (what a "send additions" call just created). */
export function newlyAddedItems(before: OrderDetail, after: OrderDetail): OrderItem[] {
  const known = new Set(before.items.map((item) => item.id));
  return activeOrderItems(after).filter((item) => !known.has(item.id));
}

/** Additions that were waiting for payment in `before` and are now on their way to the kitchen in `after`. */
export function releasedAdditions(before: OrderDetail, after: OrderDetail): OrderItem[] {
  const held = new Set(
    before.items.filter((item) => item.status === 'awaiting_payment').map((item) => item.id),
  );
  return after.items.filter(
    (item) => held.has(item.id) && item.status !== 'awaiting_payment' && item.status !== 'voided',
  );
}
