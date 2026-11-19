import type { OrderDetail, OrderStatus } from '@app/shared';

export function orderIsPaid(order: Pick<OrderDetail, 'paymentStatus' | 'dueMinor'>): boolean {
  return order.paymentStatus === 'paid' || order.dueMinor <= 0;
}

export function canShowCancelOrder(
  hasCancelPermission: boolean,
  hasCreatePermission: boolean,
  status: OrderStatus,
): boolean {
  if (status === 'draft') {
    return hasCreatePermission;
  }
  if (status === 'completed' || status === 'cancelled') {
    return false;
  }
  if (hasCancelPermission) {
    return true;
  }
  return status === 'placed' || status === 'preparing' || status === 'ready';
}

export function canVoidOrderItem(
  order: Pick<OrderDetail, 'status' | 'payments'>,
  itemVoided: boolean,
  itemAwaitingPayment = false,
): boolean {
  if (itemVoided) {
    return false;
  }
  if (
    order.status !== 'placed' &&
    order.status !== 'draft' &&
    order.status !== 'preparing' &&
    order.status !== 'ready'
  ) {
    return false;
  }
  // A held addition was never paid for or sent, so it can go even after other payments.
  if (order.payments.length > 0 && !itemAwaitingPayment) {
    return false;
  }
  return true;
}

/** A ready order is handed over with one tap: "Picked up" (takeaway) or "Served" (dine-in). */
export function canShowHandover(order: Pick<OrderDetail, 'status'>): boolean {
  return order.status === 'ready';
}

export function handoverLabelKey(
  type: OrderDetail['type'],
): 'pos.handover.served' | 'pos.handover.pickedUp' {
  return type === 'dine_in' ? 'pos.handover.served' : 'pos.handover.pickedUp';
}

export type NextStatusTarget = 'preparing' | 'ready' | 'completed';

export function nextOrderStatusTarget(
  order: Pick<OrderDetail, 'status' | 'paymentStatus' | 'dueMinor'>,
): NextStatusTarget | null {
  if (order.status === 'draft') {
    return null;
  }
  if (order.status === 'placed') {
    return 'preparing';
  }
  if (order.status === 'preparing') {
    return 'ready';
  }
  if (order.status === 'ready') {
    return 'completed';
  }
  return null;
}

export function canShowPay(order: Pick<OrderDetail, 'dueMinor' | 'status'>): boolean {
  if (order.status === 'cancelled' || order.status === 'completed') {
    return false;
  }
  return order.dueMinor > 0;
}

/** Reopen (completed -> ready) is a manager fix: needs `orders.reopen` and a completed order. */
export function canShowReopen(hasReopenPermission: boolean, status: OrderStatus): boolean {
  return hasReopenPermission && status === 'completed';
}

/** Reopen reason is optional; empty becomes "no reason", and the server accepts up to 200 chars. */
export const REOPEN_REASON_MAX = 200;

export function reopenReasonValue(raw: string): string | undefined {
  const trimmed = raw.trim().slice(0, REOPEN_REASON_MAX);
  return trimmed.length === 0 ? undefined : trimmed;
}
