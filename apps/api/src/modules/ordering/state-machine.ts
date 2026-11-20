import type { OrderStatus, PermissionKey } from '@app/shared';

import { BusinessRuleError } from '../../core/errors/app-errors';

export type StatusTransition = {
  from: OrderStatus;
  to: OrderStatus;
  permission: PermissionKey;
};

/**
 * Orders still in progress: a draft (pay-before-send, awaiting payment) or one moving through the
 * kitchen. Everything else (completed, cancelled, refunded) is finished.
 */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ['draft', 'placed', 'preparing', 'ready'];

const ALLOWED: StatusTransition[] = [
  { from: 'draft', to: 'cancelled', permission: 'orders.create' },
  { from: 'placed', to: 'preparing', permission: 'orders.update_status' },
  // One tap on a New order: the cook marks the whole order ready without ticking items first.
  { from: 'placed', to: 'ready', permission: 'orders.update_status' },
  { from: 'preparing', to: 'ready', permission: 'orders.update_status' },
  { from: 'ready', to: 'completed', permission: 'orders.update_status' },
  { from: 'placed', to: 'cancelled', permission: 'orders.cancel' },
  { from: 'preparing', to: 'cancelled', permission: 'orders.cancel' },
  { from: 'ready', to: 'cancelled', permission: 'orders.cancel' },
];

/** Reverse moves, only as a short "Undo" by the person who just made the change. */
const UNDO_ALLOWED: StatusTransition[] = [
  { from: 'ready', to: 'preparing', permission: 'orders.update_status' },
  { from: 'completed', to: 'ready', permission: 'orders.update_status' },
];

/** Manager/owner fix after the Undo window: a completed order goes back to Ready. */
export function assertReopenTransition(from: OrderStatus, to: OrderStatus): StatusTransition {
  if (from !== 'completed' || to !== 'ready') {
    throw new BusinessRuleError(
      'ORDER_INVALID_TRANSITION',
      `Cannot reopen from ${from} to ${to}`,
      { from, to },
    );
  }
  return { from, to, permission: 'orders.reopen' };
}

export function assertUndoTransition(from: OrderStatus, to: OrderStatus): StatusTransition {
  const transition = UNDO_ALLOWED.find((t) => t.from === from && t.to === to);
  if (!transition) {
    throw new BusinessRuleError(
      'ORDER_INVALID_TRANSITION',
      `Cannot undo from ${from} to ${to}`,
      { from, to },
    );
  }
  return transition;
}

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

/** Target item status when marking `not_ready` from the KDS. */
export function itemStatusForNotReady(orderStatus: OrderStatus): 'pending' | 'preparing' {
  if (orderStatus === 'placed') {
    return 'pending';
  }
  if (orderStatus === 'preparing') {
    return 'preparing';
  }
  throw new BusinessRuleError('ORDER_NOT_EDITABLE', 'Order cannot be edited in this status', {
    status: orderStatus,
  });
}

export function voidItemPermission(orderStatus: OrderStatus): PermissionKey {
  if (orderStatus === 'draft' || orderStatus === 'placed') {
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
