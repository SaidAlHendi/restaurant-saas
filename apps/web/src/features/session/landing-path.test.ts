import { describe, expect, it } from 'vitest';

import { landingPathForPermissions } from './landing-path.js';

describe('landingPathForPermissions', () => {
  it('sends kitchen-only users to /kds', () => {
    expect(landingPathForPermissions(['orders.read', 'orders.update_status'])).toBe('/kds');
  });

  it('keeps cashiers, managers and owners on the dashboard', () => {
    expect(landingPathForPermissions(['orders.create', 'orders.update_status'])).toBe('/dashboard');
    expect(landingPathForPermissions(['menu.read'])).toBe('/dashboard');
  });
});
