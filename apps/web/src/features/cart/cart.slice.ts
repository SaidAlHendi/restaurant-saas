import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { clearCartStorage, loadCartFromStorage, saveCartToStorage } from './cart-storage.js';
import type { CartLine, CartOrderType, CartState } from './cart.types.js';
import { cartLineMergeKey, mergeCartLine, newClientOrderId } from './cart.utils.js';

function emptyCart(branchId: string): CartState {
  return {
    branchId,
    clientOrderId: newClientOrderId(),
    orderType: 'takeaway',
    tableId: null,
    customerName: '',
    orderNote: '',
    lines: [],
  };
}

function persist(state: CartState): void {
  saveCartToStorage(state);
}

const initialState: CartState = {
  branchId: null,
  clientOrderId: newClientOrderId(),
  orderType: 'takeaway',
  tableId: null,
  customerName: '',
  orderNote: '',
  lines: [],
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    initCartForBranch(state, action: PayloadAction<string>) {
      const branchId = action.payload;
      const stored = loadCartFromStorage(branchId);
      if (stored && stored.branchId === branchId) {
        return stored;
      }
      const fresh = emptyCart(branchId);
      persist(fresh);
      return fresh;
    },
    setOrderType(state, action: PayloadAction<CartOrderType>) {
      state.orderType = action.payload;
      if (action.payload === 'takeaway') {
        state.tableId = null;
      } else {
        state.customerName = '';
      }
      persist(state);
    },
    setTableId(state, action: PayloadAction<string | null>) {
      state.tableId = action.payload;
      persist(state);
    },
    setCustomerName(state, action: PayloadAction<string>) {
      state.customerName = action.payload;
      persist(state);
    },
    setOrderNote(state, action: PayloadAction<string>) {
      state.orderNote = action.payload;
      persist(state);
    },
    addLine(state, action: PayloadAction<CartLine>) {
      state.lines = mergeCartLine(state.lines, action.payload);
      persist(state);
    },
    updateLineQuantity(
      state,
      action: PayloadAction<{ localId: string; quantity: number }>,
    ) {
      const line = state.lines.find((row) => row.localId === action.payload.localId);
      if (!line) {
        return;
      }
      line.quantity = action.payload.quantity;
      if (line.quantity <= 0) {
        state.lines = state.lines.filter((row) => row.localId !== action.payload.localId);
      }
      persist(state);
    },
    removeLine(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter((row) => row.localId !== action.payload);
      persist(state);
    },
    clearCartAfterSuccessfulSend(state) {
      const branchId = state.branchId;
      if (!branchId) {
        return;
      }
      const next = emptyCart(branchId);
      Object.assign(state, next);
      persist(state);
    },
    replaceCartBranch(state, action: PayloadAction<string>) {
      const branchId = action.payload;
      if (state.branchId && state.branchId !== branchId) {
        clearCartStorage(state.branchId);
      }
      const stored = loadCartFromStorage(branchId);
      if (stored && stored.branchId === branchId) {
        return stored;
      }
      const fresh = emptyCart(branchId);
      persist(fresh);
      return fresh;
    },
  },
});

export const cartReducer = cartSlice.reducer;
export const cartActions = cartSlice.actions;

export function selectCartLineCount(state: { cart: CartState }): number {
  return state.cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartHasUnsavedLines(state: { cart: CartState }): boolean {
  return state.cart.lines.length > 0;
}

export { cartLineMergeKey };
