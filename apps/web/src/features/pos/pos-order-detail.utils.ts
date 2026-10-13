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
  if (order.payments.length > 0) {
    return false;
  }
  return true;
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
  if (order.status === 'ready' && orderIsPaid(order)) {
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
