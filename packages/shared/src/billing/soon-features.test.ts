import { describe, expect, it } from 'vitest';

import { FEATURE_KEYS, LIMIT_KEYS } from './feature-keys.js';
import { SOON_FEATURE_KEYS, isFeatureSoon } from './soon-features.js';

describe('isFeatureSoon', () => {
  it('flags unbuilt keys and not built ones', () => {
    expect(isFeatureSoon('branches.multi')).toBe(true);
    expect(isFeatureSoon('limit.devices_per_branch')).toBe(true);
    expect(isFeatureSoon('pos.access')).toBe(false);
    expect(isFeatureSoon('nope')).toBe(false);
  });

  it('only lists known feature or limit keys', () => {
    const known: readonly string[] = [...FEATURE_KEYS, ...LIMIT_KEYS];
    for (const key of SOON_FEATURE_KEYS) expect(known).toContain(key);
  });
});
