import { describe, expect, it } from 'vitest';

import {
  appendPinDigit,
  backspacePin,
  pinPadCanSubmit,
  PIN_PAD_MAX_LENGTH,
  PIN_PAD_MIN_SUBMIT_LENGTH,
} from './pos-pin-pad.utils.js';

describe('pos pin pad utils', () => {
  it('caps at max digits and ignores non-digits', () => {
    let pin = '';
    for (let i = 0; i < PIN_PAD_MAX_LENGTH + 2; i += 1) {
      pin = appendPinDigit(pin, '1');
    }
    expect(pin.length).toBe(PIN_PAD_MAX_LENGTH);
    expect(appendPinDigit(pin, 'a')).toBe(pin);
  });

  it('backspace removes the last digit', () => {
    expect(backspacePin('1234')).toBe('123');
    expect(backspacePin('')).toBe('');
  });

  it('submit enabled from min length through max', () => {
    expect(pinPadCanSubmit('123')).toBe(false);
    expect(pinPadCanSubmit('1'.repeat(PIN_PAD_MIN_SUBMIT_LENGTH))).toBe(true);
    expect(pinPadCanSubmit('1'.repeat(PIN_PAD_MAX_LENGTH))).toBe(true);
    expect(pinPadCanSubmit('1'.repeat(PIN_PAD_MAX_LENGTH + 1))).toBe(false);
  });
});
