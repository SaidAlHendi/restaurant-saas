/** Where a user lands after login: kitchen-only roles go straight to the kitchen screen. */
export function landingPathForPermissions(permissions: readonly string[]): string {
  if (permissions.includes('orders.update_status') && !permissions.includes('orders.create')) {
    return '/kds';
  }
  return '/dashboard';
}
