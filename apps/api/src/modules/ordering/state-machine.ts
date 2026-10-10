import type { OrderStatus, PermissionKey } from '@app/shared';

import { BusinessRuleError } from '../../core/errors/app-errors';

export type StatusTransition = {
  from: OrderStatus;
  to: OrderStatus;
  permission: PermissionKey;
};

const ALLOWED: StatusTransition[] = [
  { from: 'placed', to: 'preparing', permission: 'orders.update_status' },
  { from: 'preparing', to: 'ready', permission: 'orders.update_status' },
  { from: 'ready', to: 'completed', permission: 'orders.update_status' },
  { from: 'placed', to: 'cancelled', permission: 'orders.cancel' },
  { from: 'preparing', to: 'cancelled', permission: 'orders.cancel' },
  { from: 'ready', to: 'cancelled', permission: 'orders.cancel' },
];

export function findTransition(from: OrderStatus, to: OrderStatus): StatusTransition | undefined {
  return ALLOWED.find((t) => t.from === from && t.to === to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): StatusTransition {
  const transition = findTransition(from, to);
  if (!transition) {
    throw new BusinessRuleError(
      'ORDER_INVALID_TRANSITION',
      `Cannot transition from ${from} to ${to}`,
      { from, to },
    );
  }
  return transition;
}

export function itemStatusForOrderStatus(status: OrderStatus): 'pending' | 'preparing' | 'ready' | null {
  if (status === 'preparing') {
    return 'preparing';
  }
  if (status === 'ready' || status === 'completed') {
    return 'ready';
  }
  return null;
}

export function voidItemPermission(orderStatus: OrderStatus): PermissionKey {
  if (orderStatus === 'placed') {
    return 'orders.create';
  }
  if (orderStatus === 'preparing' || orderStatus === 'ready') {
    return 'orders.cancel';
  }
  throw new BusinessRuleError('ORDER_NOT_EDITABLE', 'Order cannot be edited in this status', {
    status: orderStatus,
  });
}

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'placed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'refunded',
];
