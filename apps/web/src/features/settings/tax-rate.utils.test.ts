import { describe, expect, it } from 'vitest';

import { parseTaxPercentInput, taxBpToPercentInput } from './tax-rate.utils.js';

describe('parseTaxPercentInput', () => {
  it.each([
    ['0', 0],
    ['15', 1500],
    ['15.5', 1550],
    ['0.01', 1],
    ['100', 10_000],
  ] as const)('parses %s to %i bp', (input, bp) => {
    expect(parseTaxPercentInput(input)).toEqual({ ok: true, bp });
  });

  it('rejects invalid input', () => {
    expect(parseTaxPercentInput('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseTaxPercentInput('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseTaxPercentInput('-1')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseTaxPercentInput('100.01')).toEqual({ ok: false, reason: 'too_high' });
    expect(parseTaxPercentInput('15.555')).toEqual({ ok: false, reason: 'too_many_decimals' });
  });
});

describe('taxBpToPercentInput', () => {
  it('round-trips common values', () => {
    expect(taxBpToPercentInput(0)).toBe('0');
    expect(taxBpToPercentInput(1500)).toBe('15');
    expect(taxBpToPercentInput(1550)).toBe('15.5');
    expect(taxBpToPercentInput(1)).toBe('0.01');
    expect(taxBpToPercentInput(10_000)).toBe('100');
  });
});
