import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import { clearCartStorage, saveCartToStorage } from './cart-storage.js';
import { cartActions } from './cart.slice.js';
import type { CartState } from './cart.types.js';

function selectCart(state: unknown): CartState {
  if (!state || typeof state !== 'object' || !('cart' in state)) {
    throw new Error('Expected cart in listener state');
  }
  const cart = state.cart;
  if (!cart || typeof cart !== 'object') {
    throw new Error('Invalid cart state');
  }
  return cart as CartState;
}

function persistCartIfReady(cart: CartState): void {
  if (cart.branchId === null || cart.clientOrderId.length === 0) {
    return;
  }
  saveCartToStorage({
    branchId: cart.branchId,
    clientOrderId: cart.clientOrderId,
    orderType: cart.orderType,
    tableId: cart.tableId,
    customerName: cart.customerName,
    orderNote: cart.orderNote,
    lines: cart.lines,
  });
}

export const cartPersistenceListener = createListenerMiddleware();

cartPersistenceListener.startListening({
  matcher: isAnyOf(
    cartActions.initCartForBranch,
    cartActions.setOrderType,
    cartActions.setTableId,
    cartActions.setCustomerName,
    cartActions.setOrderNote,
    cartActions.addLine,
    cartActions.updateLineQuantity,
    cartActions.removeLine,
    cartActions.clearCartAfterSuccessfulSend,
    cartActions.replaceCartBranch,
  ),
  effect: (_action, api) => {
    persistCartIfReady(selectCart(api.getState()));
  },
});

cartPersistenceListener.startListening({
  actionCreator: cartActions.replaceCartBranch,
  effect: (_action, api) => {
    const previousBranchId = selectCart(api.getOriginalState()).branchId;
    const nextBranchId = selectCart(api.getState()).branchId;
    if (previousBranchId !== null && previousBranchId !== nextBranchId) {
      clearCartStorage(previousBranchId);
    }
  },
});
