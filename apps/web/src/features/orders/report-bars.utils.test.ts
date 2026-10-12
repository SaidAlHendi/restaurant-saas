import { describe, expect, it } from 'vitest';

import { barWidthPercent } from './report-bars.utils.js';

describe('barWidthPercent', () => {
  it('returns 0 when total is zero', () => {
    expect(barWidthPercent(100, 0)).toBe(0);
  });

  it('returns rounded percentage capped at 100', () => {
    expect(barWidthPercent(25, 100)).toBe(25);
    expect(barWidthPercent(200, 100)).toBe(100);
  });
});
