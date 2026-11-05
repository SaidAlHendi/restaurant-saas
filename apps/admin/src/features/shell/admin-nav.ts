import {
  BarChart3Icon,
  BellRingIcon,
  CreditCardIcon,
  FileTextIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  MessageSquareIcon,
  MonitorSmartphoneIcon,
  PlugIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StoreIcon,
  TagsIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  id: string;
  /** i18n key under adminNav.* */
  labelKey: string;
  icon: LucideIcon;
  /** Pages that exist. Everything else routes to the coming-soon stub. */
  to: string;
};

const COMING_SOON = '/coming-soon';

/** Pages built so far. Add the id here when its page ships. */
const BUILT_ROUTES: Record<string, string> = {
  overview: '/dashboard',
};

const NAV: Omit<AdminNavItem, 'to'>[] = [
  { id: 'overview', labelKey: 'adminNav.overview', icon: LayoutDashboardIcon },
  { id: 'restaurants', labelKey: 'adminNav.restaurants', icon: StoreIcon },
  { id: 'users', labelKey: 'adminNav.users', icon: UsersIcon },
  { id: 'subscriptions', labelKey: 'adminNav.subscriptions', icon: WalletIcon },
  { id: 'plans', labelKey: 'adminNav.plans', icon: TagsIcon },
  { id: 'payments', labelKey: 'adminNav.payments', icon: CreditCardIcon },
  { id: 'invoices', labelKey: 'adminNav.invoices', icon: ReceiptIcon },
  { id: 'revenue', labelKey: 'adminNav.revenue', icon: BarChart3Icon },
  { id: 'pos-activity', labelKey: 'adminNav.posActivity', icon: MonitorSmartphoneIcon },
  { id: 'kds-activity', labelKey: 'adminNav.kdsActivity', icon: GaugeIcon },
  { id: 'usage', labelKey: 'adminNav.usage', icon: FileTextIcon },
  { id: 'integrations', labelKey: 'adminNav.integrations', icon: PlugIcon },
  { id: 'support', labelKey: 'adminNav.support', icon: LifeBuoyIcon },
  { id: 'feedback', labelKey: 'adminNav.feedback', icon: MessageSquareIcon },
  { id: 'announcements', labelKey: 'adminNav.announcements', icon: BellRingIcon },
  { id: 'admin-users', labelKey: 'adminNav.adminUsers', icon: ShieldCheckIcon },
  { id: 'audit', labelKey: 'adminNav.audit', icon: ScrollTextIcon },
  { id: 'settings', labelKey: 'adminNav.settings', icon: SettingsIcon },
];

export const ADMIN_NAV: AdminNavItem[] = NAV.map((item) => ({
  ...item,
  to: BUILT_ROUTES[item.id] ?? `${COMING_SOON}/${item.id}`,
}));

/** Id of the nav item that matches the current path, or null. */
export function activeAdminNavId(pathname: string): string | null {
  const match = ADMIN_NAV.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  return match?.id ?? null;
}
