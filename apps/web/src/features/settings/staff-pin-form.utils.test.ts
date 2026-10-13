import { describe, expect, it } from 'vitest';

import { validatePinForm } from './staff-pin-form.utils.js';

describe('validatePinForm', () => {
  it('accepts matching 4-6 digit PINs', () => {
    expect(validatePinForm('1234', '1234')).toEqual({ ok: true, pin: '1234' });
    expect(validatePinForm('123456', '123456')).toEqual({ ok: true, pin: '123456' });
  });

  it('rejects too short, too long, non-digits, mismatch', () => {
    expect(validatePinForm('123', '123')).toEqual({ ok: false, reason: 'too_short' });
    expect(validatePinForm('1234567', '1234567')).toEqual({ ok: false, reason: 'too_long' });
    expect(validatePinForm('12ab', '12ab')).toEqual({ ok: false, reason: 'not_digits' });
    expect(validatePinForm('1234', '4321')).toEqual({ ok: false, reason: 'mismatch' });
  });
});
