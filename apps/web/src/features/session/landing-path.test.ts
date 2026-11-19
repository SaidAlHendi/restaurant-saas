import { describe, expect, it } from 'vitest';

import { hasDashboardAccess, landingPathForPermissions } from './landing-path.js';

const CASHIER = ['orders.create', 'orders.read', 'orders.update_status', 'menu.read'];
const KITCHEN = ['orders.read', 'orders.update_status'];
const MANAGER = [...CASHIER, 'reports.read', 'staff.read'];

describe('landingPathForPermissions', () => {
  it('sends kitchen-only users to /kds', () => {
    expect(landingPathForPermissions(KITCHEN)).toBe('/kds');
  });

  it('sends cashiers to the cashier screen, not the dashboard', () => {
    expect(landingPathForPermissions(CASHIER)).toBe('/pos');
  });

  it('keeps managers and owners on the dashboard', () => {
    expect(landingPathForPermissions(MANAGER)).toBe('/dashboard');
    expect(landingPathForPermissions(['org.manage'])).toBe('/dashboard');
  });

  it('falls back to the dashboard for anyone else', () => {
    expect(landingPathForPermissions(['menu.read'])).toBe('/dashboard');
  });
});

describe('hasDashboardAccess', () => {
  it('is false for cashiers and kitchen, true for staff who manage something', () => {
    expect(hasDashboardAccess(CASHIER)).toBe(false);
    expect(hasDashboardAccess(KITCHEN)).toBe(false);
    expect(hasDashboardAccess(MANAGER)).toBe(true);
  });
});
