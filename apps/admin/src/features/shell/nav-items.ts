import {
  BarChart3Icon,
  BellIcon,
  BuildingIcon,
  ChefHatIcon,
  CreditCardIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  MessageSquareIcon,
  PlugIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TagsIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  id: string;
  icon: LucideIcon;
  /** i18n key under nav.* */
  labelKey: string;
  /** Real page. Items without one open /coming-soon?page=<id>. */
  href?: string;
}

/** The full platform-admin sidebar (docs/plans: admin-architecture-plan §6). */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'overview', icon: LayoutDashboardIcon, labelKey: 'nav.overview', href: '/' },
  { id: 'restaurants', icon: BuildingIcon, labelKey: 'nav.restaurants' },
  { id: 'users', icon: UsersIcon, labelKey: 'nav.users' },
  { id: 'subscriptions', icon: WalletIcon, labelKey: 'nav.subscriptions' },
  { id: 'plans', icon: TagsIcon, labelKey: 'nav.plans' },
  { id: 'payments', icon: CreditCardIcon, labelKey: 'nav.payments' },
  { id: 'invoices', icon: ReceiptIcon, labelKey: 'nav.invoices' },
  { id: 'revenue', icon: BarChart3Icon, labelKey: 'nav.revenue' },
  { id: 'pos', icon: ShoppingBagIcon, labelKey: 'nav.pos' },
  { id: 'kds', icon: ChefHatIcon, labelKey: 'nav.kds' },
  { id: 'usage', icon: GaugeIcon, labelKey: 'nav.usage' },
  { id: 'integrations', icon: PlugIcon, labelKey: 'nav.integrations' },
  { id: 'tickets', icon: LifeBuoyIcon, labelKey: 'nav.tickets' },
  { id: 'feedback', icon: MessageSquareIcon, labelKey: 'nav.feedback' },
  { id: 'announcements', icon: BellIcon, labelKey: 'nav.announcements' },
  { id: 'admins', icon: ShieldCheckIcon, labelKey: 'nav.admins' },
  { id: 'audit', icon: ScrollTextIcon, labelKey: 'nav.audit' },
  { id: 'settings', icon: SettingsIcon, labelKey: 'nav.settings' },
];

export const NAV_ITEM_IDS = ADMIN_NAV_ITEMS.map((item) => item.id);

export function navHref(item: AdminNavItem): string {
  return item.href ?? `/coming-soon?page=${item.id}`;
}

/** Which item is highlighted for the current URL. */
export function activeNavId(pathname: string, page: string | null): string | null {
  if (pathname === '/') return 'overview';
  if (pathname === '/coming-soon' && page && NAV_ITEM_IDS.includes(page)) return page;
  const match = ADMIN_NAV_ITEMS.find((item) => item.href && item.href !== '/' && pathname.startsWith(item.href));
  return match?.id ?? null;
}

