import type { PublicDisplayOrder } from '@app/shared';

/** The big number on the screen: the pager if the order has one, else the order number. */
export function displayNumber(order: PublicDisplayOrder): number {
  return order.pagerNumber ?? order.orderNumber;
}

/** Stable identity of an entry, so the chime fires once per newly ready order. */
export function readyKey(order: PublicDisplayOrder): string {
  return `${String(order.orderNumber)}:${String(order.pagerNumber ?? '')}`;
}

/** True when `next` holds an order that `previous` did not. */
export function hasNewReadyOrder(
  previous: readonly PublicDisplayOrder[],
  next: readonly PublicDisplayOrder[],
): boolean {
  const seen = new Set(previous.map(readyKey));
  return next.some((order) => !seen.has(readyKey(order)));
}
