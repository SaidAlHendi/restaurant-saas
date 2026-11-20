import { describe, expect, it } from 'vitest';

import type { CartState } from '../cart/cart.types.js';
import { buildCreateOrderBody, cartForBranchOrderTypes } from './pos-order.utils.js';

const baseCart = (): CartState => ({
  branchId: '01932a1a-7b3e-7000-8000-000000000030',
  clientOrderId: '01932a1a-7b3e-7000-8000-000000000099',
  orderType: 'takeaway',
  tableId: null,
  customerName: '',
  pagerNumber: '',
  orderNote: '',
  seat: '',
  billChoice: '',
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

  it('sends guest labels and the bill choice for dine-in orders only', () => {
    const cart = baseCart();
    cart.orderType = 'dine_in';
    cart.tableId = '01932a1a-7b3e-7000-8000-000000000050';
    cart.billChoice = 'new';
    const line = cart.lines[0];
    if (line) line.seat = 'Guest 2';
    const body = buildCreateOrderBody(cart);
    expect(body?.newBill).toBe(true);
    expect(body?.items[0]?.seat).toBe('Guest 2');

    cart.billChoice = '01932a1a-7b3e-7000-8000-000000000051';
    const picked = buildCreateOrderBody(cart);
    expect(picked?.billId).toBe('01932a1a-7b3e-7000-8000-000000000051');
    expect(picked?.newBill).toBeUndefined();

    cart.orderType = 'takeaway';
    cart.tableId = null;
    const takeaway = buildCreateOrderBody(cart);
    expect(takeaway?.newBill).toBeUndefined();
    expect(takeaway?.items[0]?.seat).toBeUndefined();
  });
});

describe('cartForBranchOrderTypes', () => {
  it('moves a dine-in cart to takeaway on a takeaway-only branch and clears table, bill and seat', () => {
    const cart: CartState = {
      ...baseCart(),
      orderType: 'dine_in',
      tableId: '01932a1a-7b3e-7000-8000-000000000050',
      billChoice: 'new',
      seat: 'Guest 1',
    };
    const fixed = cartForBranchOrderTypes(cart, { supportsDineIn: false, supportsTakeaway: true });
    expect(fixed).toMatchObject({ orderType: 'takeaway', tableId: null, billChoice: '', seat: '' });
    // The first submit on the new branch is a valid takeaway order.
    expect(buildCreateOrderBody(fixed)).toMatchObject({ type: 'takeaway' });
  });

  it('moves a takeaway cart to dine-in on a dine-in-only branch, needing a table before submit', () => {
    const fixed = cartForBranchOrderTypes(baseCart(), { supportsDineIn: true, supportsTakeaway: false });
    expect(fixed.orderType).toBe('dine_in');
    expect(buildCreateOrderBody(fixed)).toBeNull();
  });

  it('returns the same cart when the branch offers its type', () => {
    const cart = baseCart();
    expect(cartForBranchOrderTypes(cart, { supportsDineIn: false, supportsTakeaway: true })).toBe(cart);
  });
});
