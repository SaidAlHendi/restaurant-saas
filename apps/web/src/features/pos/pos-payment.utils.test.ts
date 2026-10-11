import { describe, expect, it } from 'vitest';

import { cashChangeMinor, quickTenderAmounts } from './pos-payment.utils.js';

describe('quickTenderAmounts', () => {
  it('includes exact due and round-ups', () => {
    const amounts = quickTenderAmounts(1250);
    expect(amounts[0]).toBe(1250);
    expect(amounts.length).toBeGreaterThan(1);
  });
});

describe('cashChangeMinor', () => {
  it('returns zero when tendered is less than due', () => {
    expect(cashChangeMinor(1000, 1500)).toBe(0);
  });

  it('returns difference when tendered exceeds due', () => {
    expect(cashChangeMinor(2000, 1250)).toBe(750);
  });
});
