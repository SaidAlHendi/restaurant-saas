import type { PermissionKey } from '@app/shared';

export type SettingsTabId = 'restaurant' | 'branch' | 'staff';

const TAB_ORDER: SettingsTabId[] = ['restaurant', 'branch', 'staff'];

const TAB_PERMISSION: Record<SettingsTabId, PermissionKey> = {
  restaurant: 'org.manage',
  branch: 'branches.manage',
  staff: 'staff.read',
};

export function settingsTabsForPermissions(permissions: readonly string[]): SettingsTabId[] {
  const set = new Set(permissions);
  return TAB_ORDER.filter((tab) => set.has(TAB_PERMISSION[tab]));
}

export function defaultSettingsPath(permissions: readonly string[]): string {
  const tabs = settingsTabsForPermissions(permissions);
  const first = tabs[0];
  if (first === undefined) {
    return '/dashboard';
  }
  return `/dashboard/settings/${first}`;
}

export function settingsTabPath(tab: SettingsTabId): string {
  return `/dashboard/settings/${tab}`;
}
