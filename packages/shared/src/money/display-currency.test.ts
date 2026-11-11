import { describe, expect, it } from 'vitest';

import {
  convertDisplayToBaseMinor,
  convertMinorToDisplay,
  formatDisplayMinor,
  formatMoneyForDisplay,
  isDisplayConversionActive,
  type MoneyDisplay,
} from './display-currency.js';

const syp: MoneyDisplay = { currency: 'SYP', rate: 13000, itemStep: 100, totalStep: 500 };

describe('convertMinorToDisplay', () => {
  it('converts USD cents to SYP and rounds prices to the item step', () => {
    // 7.30 USD x 13,000 = 94,900 SYP (already on a 100 step)
    expect(convertMinorToDisplay(730, 'USD', syp, 'item')).toBe(94_900);
    // 0.99 USD x 13,000 = 12,870 -> 12,900
    expect(convertMinorToDisplay(99, 'USD', syp, 'item')).toBe(12_900);
  });

  it('rounds totals to the total step, half up', () => {
    // 94,900 -> 95,000
    expect(convertMinorToDisplay(730, 'USD', syp, 'total')).toBe(95_000);
    // 2.25 USD x 13,000 = 29,250: exactly half a step, rounds up to 29,500
    expect(convertMinorToDisplay(225, 'USD', syp, 'total')).toBe(29_500);
    // 2.24 USD x 13,000 = 29,120 -> 29,000
    expect(convertMinorToDisplay(224, 'USD', syp, 'total')).toBe(29_000);
  });

  it('keeps the display currency minor units when the step is 0', () => {
    const eur: MoneyDisplay = { currency: 'EUR', rate: 0.925, itemStep: 0, totalStep: 0 };
    // 10.00 USD x 0.925 = 9.25 EUR
    expect(convertMinorToDisplay(1000, 'USD', eur, 'item')).toBe(925);
    // 0.01 USD x 0.925 = 0.00925 EUR -> 1 cent (half up)
    expect(convertMinorToDisplay(1, 'USD', eur, 'item')).toBe(1);
  });

  it('handles currencies with different minor digits', () => {
    // 1.000 KWD x 3.25 = 3.25 USD
    const usd: MoneyDisplay = { currency: 'USD', rate: 3.25, itemStep: 0, totalStep: 0 };
    expect(convertMinorToDisplay(1000, 'KWD', usd, 'item')).toBe(325);
  });

  it('stays exact for large amounts and rates with decimals', () => {
    const precise: MoneyDisplay = { currency: 'SYP', rate: 13_250.75, itemStep: 0, totalStep: 0 };
    // 1,000,000.00 USD x 13,250.75
    expect(convertMinorToDisplay(100_000_000, 'USD', precise, 'total')).toBe(13_250_750_000);
  });

  it('keeps the sign of negative amounts', () => {
    expect(convertMinorToDisplay(-730, 'USD', syp, 'total')).toBe(-95_000);
  });
});

describe('convertDisplayToBaseMinor', () => {
  it('converts display cash back to the nearest base minor unit', () => {
    // 100,000 SYP / 13,000 = 7.6923 USD -> 769 cents
    expect(convertDisplayToBaseMinor(100_000, 'USD', syp)).toBe(769);
    expect(convertDisplayToBaseMinor(0, 'USD', syp)).toBe(0);
  });
});

describe('formatting', () => {
  it('shows no decimals when the step rounds to whole units', () => {
    expect(formatDisplayMinor(95_000, syp, 'en', 'total')).toBe('95,000 SYP');
    expect(formatDisplayMinor(95_000, syp, 'ar', 'total')).toContain('ل.س');
  });

  it('never shows the bare pound sign for SYP', () => {
    expect(formatDisplayMinor(95_000, syp, 'en', 'total')).not.toContain('£');
  });

  it('converts when a display currency is active and leaves base amounts alone otherwise', () => {
    expect(formatMoneyForDisplay(730, 'USD', 'en', syp, 'total')).toBe('95,000 SYP');
    expect(formatMoneyForDisplay(730, 'USD', 'en', null)).toBe('$ 7.30');
    expect(formatMoneyForDisplay(730, 'USD', 'en', { ...syp, currency: 'USD' })).toBe('$ 7.30');
  });

  it('isDisplayConversionActive is false for the base currency or no display', () => {
    expect(isDisplayConversionActive('USD', syp)).toBe(true);
    expect(isDisplayConversionActive('SYP', syp)).toBe(false);
    expect(isDisplayConversionActive('USD', null)).toBe(false);
  });
});
