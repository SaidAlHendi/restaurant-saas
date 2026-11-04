import { describe, expect, it } from 'vitest';

import { dashboardTitleKey, initialsOf } from './dashboard-shell.utils.js';

describe('dashboardTitleKey', () => {
  it('maps paths to the nav labels', () => {
    expect(dashboardTitleKey('/dashboard')).toBe('dashboard.nav.home');
    expect(dashboardTitleKey('/dashboard/orders/abc')).toBe('dashboard.nav.orders');
    expect(dashboardTitleKey('/dashboard/menu/products')).toBe('dashboard.nav.menu');
    expect(dashboardTitleKey('/dashboard/settings/staff')).toBe('dashboard.nav.settings');
    expect(dashboardTitleKey('/dashboard/billing')).toBe('dashboard.nav.billing');
  });
});

describe('initialsOf', () => {
  it('takes two initials', () => {
    expect(initialsOf('Alex  Morgan Lee')).toBe('AM');
    expect(initialsOf('')).toBe('');
  });
});
