import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, beforeEach } from 'vitest';

import { cartPersistenceListener } from './cart.listener.js';
import { cartActions, cartSlice } from './cart.slice.js';
import { cartStorageKey } from './cart-storage.js';
import type { CartLineInput } from './cart.slice.js';

const branchA = '01932a1a-7b3e-7000-8000-000000000030';
const branchB = '01932a1a-7b3e-7000-8000-000000000031';

const sampleLine: CartLineInput = {
  productId: '01932a1a-7b3e-7000-8000-000000000040',
  nameSnapshot: { en: 'Coffee' },
  unitPriceMinor: 500,
  modifierIds: [],
  modifierNames: {},
  quantity: 1,
  note: '',
};

function createTestStore() {
  return configureStore({
    reducer: { cart: cartSlice.reducer },
    middleware: (getDefault) =>
      getDefault().concat(cartPersistenceListener.middleware),
  });
}

describe('cart slice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists cart per branch and restores clientOrderId', () => {
    const store = createTestStore();
    store.dispatch(cartActions.initCartForBranch(branchA));
    const clientOrderId = store.getState().cart.clientOrderId;
    store.dispatch(cartActions.addLine(sampleLine));
    const reloaded = createTestStore();
    reloaded.dispatch(cartActions.initCartForBranch(branchA));
    expect(reloaded.getState().cart.clientOrderId).toBe(clientOrderId);
    expect(reloaded.getState().cart.lines).toHaveLength(1);
  });

  it('replaces clientOrderId after successful send', () => {
    const store = createTestStore();
    store.dispatch(cartActions.initCartForBranch(branchA));
    const before = store.getState().cart.clientOrderId;
    store.dispatch(cartActions.addLine(sampleLine));
    store.dispatch(cartActions.clearCartAfterSuccessfulSend());
    const after = store.getState().cart.clientOrderId;
    expect(after).not.toBe(before);
    expect(store.getState().cart.lines).toHaveLength(0);
    const raw = localStorage.getItem(cartStorageKey(branchA));
    expect(raw).toContain(after);
  });

  it('ignores invalid stored cart JSON', () => {
    localStorage.setItem(cartStorageKey(branchA), '{"not":"a cart"}');
    const store = createTestStore();
    store.dispatch(cartActions.initCartForBranch(branchA));
    expect(store.getState().cart.lines).toHaveLength(0);
    expect(store.getState().cart.clientOrderId.length).toBeGreaterThan(0);
  });

  it('loads stored cart for branch switch', () => {
    const storeA = createTestStore();
    storeA.dispatch(cartActions.initCartForBranch(branchA));
    storeA.dispatch(cartActions.addLine(sampleLine));
    const storeB = createTestStore();
    storeB.dispatch(cartActions.initCartForBranch(branchB));
    storeB.dispatch(cartActions.replaceCartBranch(branchA));
    expect(storeB.getState().cart.lines).toHaveLength(1);
  });
});
