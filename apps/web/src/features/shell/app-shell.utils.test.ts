import { afterEach, describe, expect, it } from 'vitest';

import {
  activeNavItemId,
  readSidebarCollapsed,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  writeSidebarCollapsed,
} from './app-shell.utils.js';

const items = [
  { id: 'home', to: '/dashboard', end: true },
  { id: 'menu', to: '/dashboard/menu', end: false },
  { id: 'pos', to: '/pos', end: false },
];

describe('activeNavItemId', () => {
  it('matches the home item only on its exact path', () => {
    expect(activeNavItemId(items, '/dashboard')).toBe('home');
    expect(activeNavItemId(items, '/dashboard/menu/products')).toBe('menu');
    expect(activeNavItemId(items, '/pos')).toBe('pos');
    expect(activeNavItemId(items, '/dashboard/menuX')).toBeNull();
    expect(activeNavItemId(items, '/kds')).toBeNull();
  });
});

describe('sidebar collapsed preference', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to collapsed below 1280px and remembers the choice', () => {
    expect(readSidebarCollapsed(1024)).toBe(true);
    expect(readSidebarCollapsed(1440)).toBe(false);
    writeSidebarCollapsed(true);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');
    expect(readSidebarCollapsed(1440)).toBe(true);
  });
});
