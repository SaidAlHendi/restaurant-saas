import { describe, expect, it } from 'vitest';

import {
  canShowCancelOrder,
  canShowPay,
  canVoidOrderItem,
  nextOrderStatusTarget,
} from './pos-order-detail.utils.js';

const baseOrder = {
  status: 'ready' as const,
  paymentStatus: 'unpaid' as const,
  dueMinor: 500,
  payments: [],
};

describe('pos order detail actions', () => {
  it('shows Pay instead of Complete when ready and unpaid', () => {
    expect(nextOrderStatusTarget(baseOrder)).toBeNull();
    expect(canShowPay(baseOrder)).toBe(true);
  });

  it('allows Complete when ready and paid', () => {
    expect(
      nextOrderStatusTarget({ ...baseOrder, paymentStatus: 'paid', dueMinor: 0 }),
    ).toBe('completed');
  });

  it('Cancel requires orders.cancel permission', () => {
    expect(canShowCancelOrder(false, true, 'placed')).toBe(false);
    expect(canShowCancelOrder(true, true, 'placed')).toBe(true);
    expect(canShowCancelOrder(true, true, 'completed')).toBe(false);
  });

  it('allows draft cancel with orders.create only', () => {
    expect(canShowCancelOrder(false, true, 'draft')).toBe(true);
    expect(canShowCancelOrder(false, false, 'draft')).toBe(false);
  });

  it('does not offer kitchen status for draft', () => {
    expect(
      nextOrderStatusTarget({
        status: 'draft',
        paymentStatus: 'unpaid',
        dueMinor: 100,
      }),
    ).toBeNull();
  });

  it('Void only when placed with no payments', () => {
    expect(canVoidOrderItem({ status: 'placed', payments: [] }, false)).toBe(true);
    expect(canVoidOrderItem({ status: 'preparing', payments: [] }, false)).toBe(false);
    expect(
      canVoidOrderItem(
        {
          status: 'placed',
          payments: [
            {
              id: '01932a1a-7b3e-7000-8000-000000000080',
              method: 'cash',
              amountMinor: 100,
              tenderedMinor: 100,
              changeMinor: 0,
              createdAt: '2026-04-01T10:00:00.000Z',
            },
          ],
        },
        false,
      ),
    ).toBe(false);
  });
});
