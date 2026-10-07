export const PERMISSION_KEYS = [
  'branches.read',
  'branches.manage',
  'staff.read',
  'staff.manage',
  'orders.create',
  'orders.cancel',
  'menu.read',
  'menu.manage',
  'reports.read',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const SYSTEM_ROLE_KEYS = ['owner', 'manager', 'cashier', 'kitchen'] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];
