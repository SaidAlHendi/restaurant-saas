import { describe, expect, it } from 'vitest';

import { businessDateSchema } from './business-date.js';

describe('businessDateSchema', () => {
  it('accepts a valid calendar date', () => {
    expect(businessDateSchema.safeParse('2028-02-29').success).toBe(true);
  });

  it('rejects invalid month', () => {
    expect(businessDateSchema.safeParse('2026-13-01').success).toBe(false);
  });

  it('rejects invalid day of month', () => {
    expect(businessDateSchema.safeParse('2026-02-30').success).toBe(false);
  });
});
