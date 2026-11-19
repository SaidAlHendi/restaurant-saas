import { describe, expect, it } from 'vitest';

import { formatMoney, intlLocaleForUi, productDisplayCurrency } from './money.js';

describe('formatMoney', () => {
  it('includes currency and uses ui locale mapping', () => {
    expect(intlLocaleForUi('ar')).toBe('ar-SA-u-ca-gregory-nu-latn');
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

describe('Western digits', () => {
  it('never produces Arabic-Indic digits in Arabic', () => {
    expect(formatMoney(123450, 'SAR', 'ar')).toMatch(/1[,٬]?234\.50|1,234.50/);
    expect(formatMoney(123450, 'SAR', 'ar')).not.toMatch(/[٠-٩]/);
  });
});
