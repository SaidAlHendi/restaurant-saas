import { describe, expect, it } from 'vitest';

import { formatMoney, intlLocaleForUi, productDisplayCurrency } from './money.js';

describe('formatMoney', () => {
  it('includes currency and uses ui locale mapping', () => {
    expect(intlLocaleForUi('ar')).toBe('ar-SA');
    const formatted = formatMoney(1500, 'SAR', 'en');
    expect(formatted).toMatch(/15\.00/);
    expect(formatted).toMatch(/SAR|ر\.س|﷼/);
  });
});

describe('productDisplayCurrency', () => {
  it('falls back when product currency is missing', () => {
    expect(productDisplayCurrency({}, 'SAR')).toBe('SAR');
    expect(productDisplayCurrency({ currency: 'KWD' }, 'SAR')).toBe('KWD');
  });
});
