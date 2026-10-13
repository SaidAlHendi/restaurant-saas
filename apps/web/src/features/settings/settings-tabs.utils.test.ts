import { describe, expect, it } from 'vitest';

import {
  defaultSettingsPath,
  settingsTabPath,
  settingsTabsForPermissions,
} from './settings-tabs.utils.js';

describe('settingsTabsForPermissions', () => {
  it('returns tabs in fixed order for each permission set', () => {
    expect(settingsTabsForPermissions(['org.manage'])).toEqual(['restaurant']);
    expect(settingsTabsForPermissions(['branches.manage'])).toEqual(['branch']);
    expect(settingsTabsForPermissions(['staff.read'])).toEqual(['staff']);
    expect(settingsTabsForPermissions(['org.manage', 'staff.read'])).toEqual(['restaurant', 'staff']);
    expect(
      settingsTabsForPermissions(['org.manage', 'branches.manage', 'staff.read']),
    ).toEqual(['restaurant', 'branch', 'staff']);
    expect(settingsTabsForPermissions(['menu.read'])).toEqual([]);
  });
});

describe('defaultSettingsPath', () => {
  it('redirects to first accessible tab', () => {
    expect(defaultSettingsPath(['staff.read', 'branches.manage'])).toBe(
      settingsTabPath('branch'),
    );
    expect(defaultSettingsPath(['staff.read'])).toBe(settingsTabPath('staff'));
    expect(defaultSettingsPath(['org.manage', 'staff.read'])).toBe(settingsTabPath('restaurant'));
    expect(defaultSettingsPath(['menu.read'])).toBe('/dashboard');
  });
});
