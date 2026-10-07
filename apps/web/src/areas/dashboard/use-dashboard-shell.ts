import { LayoutDashboardIcon, UtensilsIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useDisclosure } from '@app/ui';

import { useAppSelector } from '../../app/hooks.js';
import { selectCan } from '../../features/session/session.selectors.js';

export function useDashboardShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const canReadMenu = useAppSelector(selectCan('menu.read'));

  const collapse = useDisclosure();
  const mobile = useDisclosure();

  const navItems = useMemo(() => {
    const items = [
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
        id: 'menu-categories',
        to: '/dashboard/menu',
        icon: UtensilsIcon,
        label: t('dashboard.nav.menu'),
        end: false,
      });
    }
    return items;
  }, [canReadMenu, t]);

  const menuSubNav = useMemo(
    () =>
      canReadMenu
        ? [
            { to: '/dashboard/menu/categories', label: t('menu.nav.categories') },
            { to: '/dashboard/menu/products', label: t('menu.nav.products') },
            { to: '/dashboard/menu/modifier-groups', label: t('menu.nav.modifierGroups') },
          ]
        : [],
    [canReadMenu, t],
  );

  const isMenuSection = location.pathname.startsWith('/dashboard/menu');

  return {
    t,
    collapsed: collapse.open,
    onToggleCollapsed: collapse.toggle,
    mobileOpen: mobile.open,
    onMobileOpenChange: mobile.setOpen,
    onOpenMobile: mobile.onOpen,
    navItems,
    menuSubNav,
    isMenuSection,
    pathname: location.pathname,
    onNavigate: (to: string) => {
      void navigate(to);
    },
    sidebarLabel: t('dashboard.nav.sidebar'),
    closeLabel: t('dashboard.nav.closeSidebar'),
    brand: t('app.title'),
    menuSectionLabel: t('menu.nav.section'),
  };
}

export type DashboardShellViewModel = ReturnType<typeof useDashboardShell>;
