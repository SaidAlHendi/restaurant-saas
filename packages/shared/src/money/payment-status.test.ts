import { describe, expect, it } from 'vitest';

import { computeDueMinor, computePaymentStatus } from './payment-status.js';

describe('computePaymentStatus', () => {
  it('returns paid when total is zero or negative', () => {
    expect(computePaymentStatus(0, 0)).toBe('paid');
    expect(computePaymentStatus(0, 100)).toBe('paid');
  });

  it('returns unpaid when nothing captured', () => {
    expect(computePaymentStatus(1000, 0)).toBe('unpaid');
  });

  it('returns partial when captured is below total', () => {
    expect(computePaymentStatus(1000, 400)).toBe('partial');
  });

  it('returns paid when captured meets or exceeds total', () => {
    expect(computePaymentStatus(1000, 1000)).toBe('paid');
    expect(computePaymentStatus(1000, 1200)).toBe('paid');
  });
});

describe('computeDueMinor', () => {
  it('never returns negative due', () => {
    expect(computeDueMinor(1000, 1200)).toBe(0);
    expect(computeDueMinor(1000, 300)).toBe(700);
  });
});
