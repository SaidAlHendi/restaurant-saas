/** Translation key of the page title shown in the dashboard top bar. */
export function dashboardTitleKey(pathname: string): string {
  if (pathname.startsWith('/dashboard/orders')) {
    return 'dashboard.nav.orders';
  }
  if (pathname.startsWith('/dashboard/menu')) {
    return 'dashboard.nav.menu';
  }
  if (pathname.startsWith('/dashboard/staff')) {
    return 'dashboard.nav.staff';
  }
  if (pathname.startsWith('/dashboard/branches')) {
    return 'dashboard.nav.branches';
  }
  if (pathname.startsWith('/dashboard/billing')) {
    return 'dashboard.nav.billing';
  }
  if (pathname.startsWith('/dashboard/settings')) {
    return 'dashboard.nav.settings';
  }
  return 'dashboard.nav.home';
}

/** First letters of the first two words, upper case ("Alex Morgan" gives "AM"). */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
