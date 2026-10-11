import { describe, expect, it, beforeEach } from 'vitest';

import { cartActions, cartSlice } from './cart.slice.js';
import { cartStorageKey } from './cart-storage.js';
import type { CartLine } from './cart.types.js';

const branchA = '01932a1a-7b3e-7000-8000-000000000030';

const sampleLine: CartLine = {
  localId: 'line-1',
  productId: 'prod-1',
  nameSnapshot: { en: 'Coffee' },
  unitPriceMinor: 500,
  modifierIds: [],
  modifierNames: {},
  quantity: 1,
  note: '',
};

describe('cart slice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists cart per branch and restores clientOrderId', () => {
    let state = cartSlice.reducer(undefined, cartActions.initCartForBranch(branchA));
    const clientOrderId = state.clientOrderId;
    state = cartSlice.reducer(state, cartActions.addLine(sampleLine));
    const reloaded = cartSlice.reducer(undefined, cartActions.initCartForBranch(branchA));
    expect(reloaded.clientOrderId).toBe(clientOrderId);
    expect(reloaded.lines).toHaveLength(1);
  });

  it('replaces clientOrderId after successful send', () => {
    let state = cartSlice.reducer(undefined, cartActions.initCartForBranch(branchA));
    const before = state.clientOrderId;
    state = cartSlice.reducer(state, cartActions.addLine(sampleLine));
    state = cartSlice.reducer(state, cartActions.clearCartAfterSuccessfulSend());
    expect(state.clientOrderId).not.toBe(before);
    expect(state.lines).toHaveLength(0);
    expect(localStorage.getItem(cartStorageKey(branchA))).toContain(state.clientOrderId);
  });
});
