import { describe, expect, it } from 'vitest';

import { isPlanGateEnabled } from './plan-gate.js';

describe('isPlanGateEnabled', () => {
  it('is on only for staging and production', () => {
    expect(isPlanGateEnabled('staging')).toBe(true);
    expect(isPlanGateEnabled('production')).toBe(true);
    expect(isPlanGateEnabled('development')).toBe(false);
    expect(isPlanGateEnabled('test')).toBe(false);
  });
});
