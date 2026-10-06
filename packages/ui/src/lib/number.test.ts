import { describe, expect, it } from 'vitest';

import {
  clamp,
  currencyDigits,
  formatMinor,
  minorToText,
  normalizeDigits,
  parseMinor,
  parseNumber,
} from './number.js';

describe('normalizeDigits', () => {
  it('converts Arabic-Indic and Persian digits and separators', () => {
    expect(normalizeDigits('١٢٣٫٤٥')).toBe('123.45');
    expect(normalizeDigits('۱۲۳')).toBe('123');
    expect(normalizeDigits('1٬234,5')).toBe('1234.5');
  });
});

describe('currencyDigits', () => {
  it.each([
    ['SAR', 2],
    ['USD', 2],
    ['KWD', 3],
    ['BHD', 3],
    ['JOD', 3],
    ['OMR', 3],
    ['JPY', 0],
  ])('%s has %i minor digits', (currency, digits) => {
    expect(currencyDigits(currency)).toBe(digits);
  });
});

describe('parseMinor', () => {
  it.each([
    ['12.5', 2, 1250],
    ['12.50', 2, 1250],
    ['12', 2, 1200],
    ['.5', 2, 50],
    ['0.125', 3, 125],
    ['١٢٫٥', 2, 1250],
    ['1500', 0, 1500],
  ])('"%s" with %i digits -> %i', (text, digits, minor) => {
    expect(parseMinor(text, digits)).toBe(minor);
  });

  it('returns null for empty text', () => {
    expect(parseMinor('', 2)).toBeNull();
    expect(parseMinor('  ', 2)).toBeNull();
  });

  it('rejects too many decimals, letters and negatives by default', () => {
    expect(parseMinor('1.234', 2)).toBeUndefined();
    expect(parseMinor('12a', 2)).toBeUndefined();
    expect(parseMinor('-5', 2)).toBeUndefined();
    expect(parseMinor('-5', 2, { allowNegative: true })).toBe(-500);
  });

  it('never uses float math (0.1 + 0.2 style errors)', () => {
    expect(parseMinor('0.29', 2)).toBe(29);
    expect(parseMinor('1.005', 3)).toBe(1005);
  });
});

describe('minorToText / formatMinor', () => {
  it('formats minor units for editing', () => {
    expect(minorToText(1250, 2)).toBe('12.50');
    expect(minorToText(5, 2)).toBe('0.05');
    expect(minorToText(1500, 3)).toBe('1.500');
    expect(minorToText(-50, 2)).toBe('-0.50');
    expect(minorToText(7, 0)).toBe('7');
  });

  it('formats for display in the locale', () => {
    expect(formatMinor(123456, 2, 'en')).toBe('1,234.56');
    expect(formatMinor(1500, 3, 'en')).toBe('1.500');
  });
});

describe('parseNumber / clamp', () => {
  it('parses integers and rejects decimals unless allowed', () => {
    expect(parseNumber('٣')).toBe(3);
    expect(parseNumber('2.5')).toBeUndefined();
    expect(parseNumber('2.5', { allowDecimal: true })).toBe(2.5);
    expect(parseNumber('')).toBeNull();
  });

  it('clamps to bounds', () => {
    expect(clamp(12, 1, 10)).toBe(10);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(5)).toBe(5);
  });
});
