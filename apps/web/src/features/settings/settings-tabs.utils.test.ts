import { describe, expect, it } from 'vitest';

import {
  defaultSettingsPath,
  settingsTabPath,
  settingsTabsForPermissions,
} from './settings-tabs.utils.js';

describe('settingsTabsForPermissions', () => {
  it('only offers the restaurant tab, to those who can manage the org', () => {
    expect(settingsTabsForPermissions(['org.manage'])).toEqual(['restaurant']);
    expect(settingsTabsForPermissions(['branches.manage', 'staff.read'])).toEqual([]);
    expect(settingsTabsForPermissions(['menu.read'])).toEqual([]);
  });
});

describe('defaultSettingsPath', () => {
  it('redirects to the restaurant tab or back to the dashboard', () => {
    expect(defaultSettingsPath(['org.manage', 'staff.read'])).toBe(settingsTabPath('restaurant'));
    expect(defaultSettingsPath(['staff.read'])).toBe('/dashboard');
  });
});
