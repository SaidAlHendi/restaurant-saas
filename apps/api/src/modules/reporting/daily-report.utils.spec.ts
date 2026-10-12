import {
  averageTicketMinor,
  fillByPaymentMethod,
  fillByType,
  sumByPaymentMethodAmount,
  unpaidMinor,
} from './daily-report.utils';

describe('daily-report.utils', () => {
  it('averageTicketMinor rounds and returns 0 when no orders', () => {
    expect(averageTicketMinor(0, 0)).toBe(0);
    expect(averageTicketMinor(1000, 3)).toBe(333);
  });

  it('unpaidMinor never goes below zero', () => {
    expect(unpaidMinor(5000, 3000)).toBe(2000);
    expect(unpaidMinor(5000, 6000)).toBe(0);
  });

  it('fillByType always returns dine_in and takeaway', () => {
    const filled = fillByType([{ type: 'takeaway', ordersCount: 2, salesMinor: 4000 }]);
    expect(filled).toHaveLength(2);
    expect(filled.find((r) => r.type === 'dine_in')?.ordersCount).toBe(0);
    expect(filled.find((r) => r.type === 'takeaway')?.salesMinor).toBe(4000);
  });

  it('fillByPaymentMethod sums to paidMinor when all methods present', () => {
    const paidMinor = 7500;
    const byPaymentMethod = fillByPaymentMethod([
      { method: 'cash', paymentsCount: 1, amountMinor: 2500 },
      { method: 'card', paymentsCount: 2, amountMinor: 5000 },
    ]);
    expect(byPaymentMethod).toHaveLength(3);
    expect(byPaymentMethod.find((r) => r.method === 'other')?.amountMinor).toBe(0);
    expect(sumByPaymentMethodAmount(byPaymentMethod)).toBe(paidMinor);
  });
});
