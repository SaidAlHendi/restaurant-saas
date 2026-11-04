import { describe, expect, it } from 'vitest';

import { activeAdminNavId, ADMIN_NAV } from './admin-nav.js';

describe('admin nav', () => {
  it('lists the 18 sidebar items', () => {
    expect(ADMIN_NAV).toHaveLength(18);
  });

  it('sends pages that are not built yet to the coming-soon stub', () => {
    const restaurants = ADMIN_NAV.find((item) => item.id === 'restaurants');
    expect(restaurants?.to).toBe('/coming-soon/restaurants');
    expect(ADMIN_NAV.find((item) => item.id === 'overview')?.to).toBe('/dashboard');
  });

  it('finds the active item from the path', () => {
    expect(activeAdminNavId('/dashboard')).toBe('overview');
    expect(activeAdminNavId('/coming-soon/audit')).toBe('audit');
    expect(activeAdminNavId('/nope')).toBeNull();
  });
});
