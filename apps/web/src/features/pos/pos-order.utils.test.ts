import { describe, expect, it } from 'vitest';

import type { CartState } from '../cart/cart.types.js';
import { buildCreateOrderBody } from './pos-order.utils.js';

const baseCart = (): CartState => ({
  branchId: '01932a1a-7b3e-7000-8000-000000000030',
  clientOrderId: '01932a1a-7b3e-7000-8000-000000000099',
  orderType: 'takeaway',
  tableId: null,
  customerName: '',
  orderNote: '',
  lines: [
    {
      localId: 'l1',
      productId: '01932a1a-7b3e-7000-8000-000000000040',
      nameSnapshot: { en: 'Tea' },
      unitPriceMinor: 500,
      modifierIds: [],
      modifierNames: {},
      quantity: 1,
      note: '',
    },
  ],
});

describe('buildCreateOrderBody', () => {
  it('returns null when cart is empty', () => {
    const cart = baseCart();
    cart.lines = [];
    expect(buildCreateOrderBody(cart)).toBeNull();
  });

  it('returns null for dine-in without table', () => {
    const cart = baseCart();
    cart.orderType = 'dine_in';
    cart.tableId = null;
    expect(buildCreateOrderBody(cart)).toBeNull();
  });

  it('builds body for takeaway with client order id', () => {
    const cart = baseCart();
    const body = buildCreateOrderBody(cart);
    expect(body?.clientOrderId).toBe(cart.clientOrderId);
    expect(body?.type).toBe('takeaway');
    expect(body?.items).toHaveLength(1);
  });
});
