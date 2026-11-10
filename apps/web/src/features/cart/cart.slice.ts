import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { randomUuid } from '../../lib/uuid.js';
import { loadCartFromStorage } from './cart-storage.js';
import type { StoredCartState } from './cart.schema.js';
import type { CartLine, CartLineInput, CartOrderType, CartState } from './cart.types.js';
import { cartLineMergeKey, mergeCartLine } from './cart.utils.js';

export type { CartLineInput };

function emptyCartForBranch(branchId: string): StoredCartState {
  return {
    branchId,
    clientOrderId: randomUuid(),
    orderType: 'takeaway',
    tableId: null,
    customerName: '',
    pagerNumber: '',
    orderNote: '',
    lines: [],
  };
}

function toCartState(stored: StoredCartState): CartState {
  return stored;
}

const initialState: CartState = {
  branchId: null,
  clientOrderId: '',
  orderType: 'takeaway',
  tableId: null,
  customerName: '',
  pagerNumber: '',
  orderNote: '',
  lines: [],
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    initCartForBranch: {
      prepare(branchId: string) {
        const stored = loadCartFromStorage(branchId);
        const cart = stored ?? emptyCartForBranch(branchId);
        return { payload: toCartState(cart) };
      },
      reducer(_state, action: PayloadAction<CartState>) {
        return action.payload;
      },
    },
    setOrderType(state, action: PayloadAction<CartOrderType>) {
      state.orderType = action.payload;
      if (action.payload === 'takeaway') {
        state.tableId = null;
      } else {
        state.customerName = '';
      }
    },
    setTableId(state, action: PayloadAction<string | null>) {
      state.tableId = action.payload;
    },
    setCustomerName(state, action: PayloadAction<string>) {
      state.customerName = action.payload;
    },
    setPagerNumber(state, action: PayloadAction<string>) {
      state.pagerNumber = action.payload.replace(/\D/g, '').slice(0, 4);
    },
    setOrderNote(state, action: PayloadAction<string>) {
      state.orderNote = action.payload;
    },
    addLine: {
      prepare(line: CartLineInput) {
        return {
          payload: {
            ...line,
            localId: randomUuid(),
          } satisfies CartLine,
        };
      },
      reducer(state, action: PayloadAction<CartLine>) {
        state.lines = mergeCartLine(state.lines, action.payload);
      },
    },
    updateLineQuantity(state, action: PayloadAction<{ localId: string; quantity: number }>) {
      const line = state.lines.find((row) => row.localId === action.payload.localId);
      if (!line) {
        return;
      }
      line.quantity = action.payload.quantity;
      if (line.quantity <= 0) {
        state.lines = state.lines.filter((row) => row.localId !== action.payload.localId);
      }
    },
    /** Replaces a line in place (edit modifiers); merges into a twin line if one now matches. */
    replaceLine(state, action: PayloadAction<{ localId: string; line: CartLineInput }>) {
      const index = state.lines.findIndex((row) => row.localId === action.payload.localId);
      if (index === -1) {
        return;
      }
      const replacement: CartLine = { ...action.payload.line, localId: action.payload.localId };
      const without = state.lines.filter((row) => row.localId !== action.payload.localId);
      const twinIndex = without.findIndex(
        (row) => cartLineMergeKey(row) === cartLineMergeKey(replacement),
      );
      const twin = without[twinIndex];
      if (twin !== undefined) {
        twin.quantity += replacement.quantity;
        state.lines = without;
        return;
      }
      state.lines = [...without.slice(0, index), replacement, ...without.slice(index)];
    },
    removeLine(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter((row) => row.localId !== action.payload);
    },
    clearCartAfterSuccessfulSend(state) {
      if (state.branchId === null) {
        return;
      }
      return toCartState(emptyCartForBranch(state.branchId));
    },
    replaceCartBranch(_state, action: PayloadAction<string>) {
      const stored = loadCartFromStorage(action.payload);
      return toCartState(stored ?? emptyCartForBranch(action.payload));
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
