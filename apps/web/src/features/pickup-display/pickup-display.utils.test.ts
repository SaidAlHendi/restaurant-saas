import { describe, expect, it } from 'vitest';

import { displayNumber, hasNewReadyOrder } from './pickup-display.utils.js';

const a = { orderNumber: 12, pagerNumber: null };
const b = { orderNumber: 13, pagerNumber: 7 };

describe('pickup display utils', () => {
  it('prefers the pager number', () => {
    expect(displayNumber(a)).toBe(12);
    expect(displayNumber(b)).toBe(7);
  });

  it('detects a newly ready order only', () => {
    expect(hasNewReadyOrder([], [a])).toBe(true);
    expect(hasNewReadyOrder([a], [a])).toBe(false);
    expect(hasNewReadyOrder([a, b], [a])).toBe(false);
    expect(hasNewReadyOrder([a], [a, b])).toBe(true);
  });
});
