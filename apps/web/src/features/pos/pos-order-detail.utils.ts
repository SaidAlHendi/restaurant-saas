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

export type PosDetailAction =
  | 'pay'
  | 'startPreparing'
  | 'markReady'
  | 'handover'
  | 'addItems'
  | 'printReceipt'
  | 'printKitchen'
  | 'cancel'
  | 'reopen';

export type PosDetailActionLayout = {
  /** The one big button in the sticky footer, or null (completed and cancelled orders). */
  primary: PosDetailAction | null;
  /** Smaller buttons next to it. */
  secondary: PosDetailAction[];
  /** "More" menu, safe items. */
  more: PosDetailAction[];
  /** "More" menu, destructive items (red). */
  destructive: PosDetailAction[];
  /** "More" menu, "Manager" section. */
  manager: PosDetailAction[];
};

/**
 * Which actions the POS sheet shows and where. Presentation only: the rules (who may cancel, add
 * items, reopen) come in as booleans from the helpers above, and the server still decides.
 */
export function posDetailActionLayout(input: {
  order: Pick<OrderDetail, 'status' | 'paymentStatus' | 'dueMinor'>;
  canAddItems: boolean;
  canCancel: boolean;
  canReopen: boolean;
}): PosDetailActionLayout {
  const { order } = input;
  const pay = canShowPay(order);
  const secondary: PosDetailAction[] = [];
  let primary: PosDetailAction | null = null;

  if (order.status === 'draft') {
    primary = pay ? 'pay' : null;
  } else if (order.status === 'placed') {
    primary = 'startPreparing';
    secondary.push('markReady');
  } else if (order.status === 'preparing') {
    primary = 'markReady';
  } else if (order.status === 'ready') {
    primary = 'handover';
  }
  if (pay && primary !== 'pay') {
    secondary.push('pay');
  }
  if (input.canAddItems) {
    secondary.push('addItems');
  }

  return {
    primary,
    secondary,
    more: ['printReceipt', 'printKitchen'],
    destructive: input.canCancel ? ['cancel'] : [],
    manager: input.canReopen ? ['reopen'] : [],
  };
}

/**
 * The dashboard order page has no "add items" mode (that lives on the POS) and shows only what the
 * user's permissions allow: Pay and print need `orders.create`, status buttons `orders.update_status`.
 */
export function dashboardActionLayout(
  layout: PosDetailActionLayout,
  can: { create: boolean; updateStatus: boolean },
): PosDetailActionLayout {
  const allowed = (action: PosDetailAction): boolean => {
    switch (action) {
      case 'addItems':
        return false;
      case 'pay':
      case 'printReceipt':
      case 'printKitchen':
        return can.create;
      case 'startPreparing':
      case 'markReady':
      case 'handover':
        return can.updateStatus;
      default:
        return true;
    }
  };
  return {
    primary: layout.primary !== null && allowed(layout.primary) ? layout.primary : null,
    secondary: layout.secondary.filter(allowed),
    more: layout.more.filter(allowed),
    destructive: layout.destructive.filter(allowed),
    manager: layout.manager.filter(allowed),
  };
}

export function hasAnyDashboardAction(layout: PosDetailActionLayout): boolean {
  return (
    layout.primary !== null ||
    layout.secondary.length + layout.more.length + layout.destructive.length + layout.manager.length > 0
  );
}
