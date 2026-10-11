import type { CreateOrderBody } from '@app/shared';

import type { CartState } from '../cart/cart.types.js';

export function buildCreateOrderBody(cart: CartState): CreateOrderBody | null {
  if (cart.lines.length === 0) {
    return null;
  }
  if (cart.orderType === 'dine_in' && cart.tableId === null) {
    return null;
  }
  const customerName =
    cart.orderType === 'takeaway' && cart.customerName.trim().length > 0
      ? cart.customerName.trim()
      : undefined;
  return {
    clientOrderId: cart.clientOrderId,
    type: cart.orderType,
    tableId: cart.orderType === 'dine_in' ? (cart.tableId ?? undefined) : undefined,
    customerName,
    notes: cart.orderNote.trim().length > 0 ? cart.orderNote.trim() : undefined,
    items: cart.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      modifierIds: line.modifierIds,
      notes: line.note.trim().length > 0 ? line.note.trim() : undefined,
    })),
  };
}
