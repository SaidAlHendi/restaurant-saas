import { EntitlementsRawCache } from './entitlements-cache';

describe('EntitlementsRawCache', () => {
  it('expires entries after TTL', () => {
    const cache = new EntitlementsRawCache();
    cache.set(
      'org',
      { subscription: null, subscriptionPlanFeatures: [], freePlanFeatures: [] },
      0,
    );
    expect(cache.get('org', 29_999)).toBeDefined();
    expect(cache.get('org', 30_001)).toBeUndefined();
  });

  it('invalidate removes entry', () => {
    const cache = new EntitlementsRawCache();
    cache.set(
      'org',
      { subscription: null, subscriptionPlanFeatures: [], freePlanFeatures: [] },
      0,
    );
    cache.invalidate('org');
    expect(cache.get('org', 0)).toBeUndefined();
  });
});
