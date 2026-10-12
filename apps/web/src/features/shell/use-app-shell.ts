import {
  ChefHatIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShoppingBagIcon,
  UtensilsIcon,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useDisclosure, useTheme } from '@app/ui';

import { useAppDispatch, useAppSelector } from '../../app/hooks.js';
import { setAppLanguage } from '../../lib/i18n.js';
import { useLogoutMutation } from '../auth/auth.api.js';
import { clearSession } from '../session/session.slice.js';
import { selectCan, selectSessionOrg, selectSessionUser } from '../session/session.selectors.js';
import { activeNavItemId, readSidebarCollapsed, writeSidebarCollapsed } from './app-shell.utils.js';

type NavItem = { id: string; to: string; end: boolean; icon: LucideIcon; label: string };

export function useAppShell() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectSessionUser);
  const org = useAppSelector(selectSessionOrg);
  const canReadMenu = useAppSelector(selectCan('menu.read'));
  const canManageBranches = useAppSelector(selectCan('branches.manage'));
  const canUsePos = useAppSelector(selectCan('orders.create'));
  const canUseKds = useAppSelector(selectCan('orders.update_status'));
  const { theme, toggleTheme } = useTheme();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  const [collapsed, setCollapsed] = useState(() =>
    readSidebarCollapsed(typeof window === 'undefined' ? 1440 : window.innerWidth),
  );
  const mobile = useDisclosure();

  const navItems = useMemo(() => {
    const items: NavItem[] = [
      {
        id: 'home',
        to: '/dashboard',
        icon: LayoutDashboardIcon,
        label: t('dashboard.nav.home'),
        end: true,
      },
    ];
    if (canReadMenu) {
      items.push({
        id: 'menu',
        to: '/dashboard/menu',
        icon: UtensilsIcon,
        label: t('dashboard.nav.menu'),
        end: false,
      });
    }
    if (canUsePos) {
      items.push({
        id: 'cashier',
        to: '/pos',
        icon: ShoppingBagIcon,
        label: t('dashboard.nav.cashier'),
        end: false,
      });
    }
    if (canUseKds) {
      items.push({
        id: 'kitchen',
        to: '/kds',
        icon: ChefHatIcon,
        label: t('dashboard.nav.kitchen'),
        end: false,
      });
    }
    if (canManageBranches) {
      items.push({
        id: 'branchSettings',
        to: '/dashboard/settings/branch',
        icon: SettingsIcon,
        label: t('dashboard.nav.branchSettings'),
        end: true,
      });
    }
    return items;
  }, [canManageBranches, canReadMenu, canUsePos, canUseKds, t]);

  const activeId = activeNavItemId(navItems, location.pathname);

  const menuSubNav = useMemo(
    () =>
      canReadMenu && location.pathname.startsWith('/dashboard/menu')
        ? [
            { to: '/dashboard/menu/categories', label: t('menu.nav.categories') },
            { to: '/dashboard/menu/products', label: t('menu.nav.products') },
            { to: '/dashboard/menu/modifier-groups', label: t('menu.nav.modifierGroups') },
            { to: '/dashboard/menu/tables', label: t('menu.nav.tables') },
            { to: '/dashboard/menu/qr-codes', label: t('menu.nav.qrCodes') },
          ].map((item) => ({ ...item, active: location.pathname === item.to }))
        : [],
    [canReadMenu, location.pathname, t],
  );

  const posSubNav = useMemo(
    () =>
      canUsePos && location.pathname.startsWith('/pos')
        ? [
            { to: '/pos', label: t('pos.nav.newOrder'), end: true },
            { to: '/pos/orders', label: t('pos.nav.orders'), end: true },
          ].map((item) => ({
            ...item,
            active: item.end
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
          }))
        : [],
    [canUsePos, location.pathname, t],
  );

  const onToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      writeSidebarCollapsed(!prev);
      return !prev;
    });
  }, []);

  const onLogout = useCallback(async () => {
    try {
      await logout(undefined).unwrap();
    } catch {
      // Sign out locally even when the server call fails (offline, expired session).
    } finally {
      dispatch(clearSession());
      void navigate('/login', { replace: true });
    }
  }, [dispatch, logout, navigate]);

  const isArabic = i18n.language.startsWith('ar');
  const isDark = theme === 'forest';

  return {
    brand: org?.name ?? t('app.title'),
    brandInitial: (org?.name ?? t('app.title')).trim().charAt(0).toUpperCase(),
    collapsed,
    onToggleCollapsed,
    mobileOpen: mobile.open,
    onMobileOpenChange: mobile.setOpen,
    onOpenMobile: mobile.onOpen,
    navItems: navItems.map((item) => ({
      id: item.id,
      icon: item.icon,
      label: item.label,
      active: item.id === activeId,
      onSelect: () => {
        void navigate(item.to);
      },
    })),
    menuSubNav: menuSubNav.map((item) => ({
      ...item,
      onSelect: () => {
        void navigate(item.to);
      },
    })),
    posSubNav: posSubNav.map((item) => ({
      ...item,
      onSelect: () => {
        void navigate(item.to);
      },
    })),
    user: user ? { name: user.name, detail: user.email } : null,
    isDark,
    onToggleTheme: toggleTheme,
    onToggleLanguage: () => {
      void setAppLanguage(isArabic ? 'en' : 'ar');
    },
    loggingOut,
    onLogout: () => {
      void onLogout();
    },
    labels: {
      sidebar: t('dashboard.nav.sidebar'),
      closeSidebar: t('dashboard.nav.closeSidebar'),
      toggleSidebar: t('shell.toggleSidebar'),
      menuSection: t('menu.nav.section'),
      posSection: t('pos.nav.section'),
      theme: isDark ? t('shell.lightMode') : t('shell.darkMode'),
      // Always shown in the language it switches to, so it can be found in either language.
      language: isArabic ? 'English' : 'العربية',
      logout: t('auth.logout'),
      loading: t('common.loading'),
    },
  };
}

export type AppShellViewModel = ReturnType<typeof useAppShell>;
