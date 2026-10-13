import type { OrderStatus, PinUserListItem } from '@app/shared';

export function filterApproverPinUsers(items: PinUserListItem[]): PinUserListItem[] {
  return items.filter((item) => item.roleKey === 'owner' || item.roleKey === 'manager');
}

export function cancelOrderNeedsApproval(
  status: OrderStatus,
  hasCancelPermission: boolean,
): boolean {
  if (status === 'draft') {
    return false;
  }
  if (status === 'completed' || status === 'cancelled') {
    return false;
  }
  return !hasCancelPermission;
}

export function voidItemNeedsApproval(
  orderStatus: OrderStatus,
  hasCancelPermission: boolean,
  hasCreatePermission: boolean,
): boolean {
  if (orderStatus === 'preparing' || orderStatus === 'ready') {
    return !hasCancelPermission;
  }
  if (orderStatus === 'placed' || orderStatus === 'draft') {
    return !hasCreatePermission;
  }
  return false;
}

export type OrderActionDialogStep = 'reason' | 'approval';

export function orderActionDialogStepAfterReason(
  needsApproval: boolean,
): 'approval' | 'submit' {
  return needsApproval ? 'approval' : 'submit';
}

export function buildOrderApprovalBody(
  membershipId: string,
  pin: string,
): { membershipId: string; pin: string } {
  return { membershipId, pin };
}
