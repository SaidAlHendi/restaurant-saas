/** Permissions that make the management dashboard worth opening (reports, staff, settings, billing). */
const DASHBOARD_PERMISSIONS = [
  'reports.read',
  'staff.read',
  'branches.manage',
  'org.manage',
  'billing.manage',
] as const;

/** True when the user can manage something on the dashboard, beyond the cashier and kitchen screens. */
export function hasDashboardAccess(permissions: readonly string[]): boolean {
  return DASHBOARD_PERMISSIONS.some((permission) => permissions.includes(permission));
}

/**
 * Where a user lands after login: managers and owners on the dashboard, cashiers on the cashier screen
 * and kitchen-only roles on the kitchen screen.
 */
export function landingPathForPermissions(permissions: readonly string[]): string {
  if (hasDashboardAccess(permissions)) {
    return '/dashboard';
  }
  if (permissions.includes('orders.create')) {
    return '/pos';
  }
  if (permissions.includes('orders.update_status')) {
    return '/kds';
  }
  return '/dashboard';
}
