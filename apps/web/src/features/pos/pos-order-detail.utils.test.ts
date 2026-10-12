import { describe, expect, it } from 'vitest';

import {
  canShowCancelOrder,
  nextOrderStatusTarget,
} from './pos-order-detail.utils.js';

describe('pos-order-detail.utils', () => {
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
});
