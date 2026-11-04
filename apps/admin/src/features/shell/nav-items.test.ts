import { describe, expect, it } from 'vitest';

import { activeNavId, ADMIN_NAV_ITEMS, navHref } from './nav-items';

describe('admin nav', () => {
  it('has the 18 planned items with unique ids', () => {
    expect(ADMIN_NAV_ITEMS).toHaveLength(18);
    expect(new Set(ADMIN_NAV_ITEMS.map((i) => i.id)).size).toBe(18);
  });
  it('sends items without a page to the coming-soon stub', () => {
    const users = ADMIN_NAV_ITEMS.find((i) => i.id === 'users');
    expect(users && navHref(users)).toBe('/coming-soon?page=users');
  });
  it('highlights the current item', () => {
    expect(activeNavId('/', null)).toBe('overview');
    expect(activeNavId('/coming-soon', 'audit')).toBe('audit');
    expect(activeNavId('/coming-soon', 'nope')).toBeNull();
  });
});
