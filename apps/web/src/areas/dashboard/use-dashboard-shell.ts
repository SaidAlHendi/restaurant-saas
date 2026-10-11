import { LayoutDashboardIcon, UtensilsIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useDisclosure } from '@app/ui';

import { useAppDispatch, useAppSelector } from '../../app/hooks.js';
import { applyDashboardBranchChange } from '../../features/session/apply-dashboard-branch-change.js';
import {
  selectCan,
  selectCurrentBranchId,
  selectSessionBranches,
  selectSessionOrg,
} from '../../features/session/session.selectors.js';

export function useDashboardShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const canReadMenu = useAppSelector(selectCan('menu.read'));
  const org = useAppSelector(selectSessionOrg);
  const branches = useAppSelector(selectSessionBranches);
  const currentBranchId = useAppSelector(selectCurrentBranchId);

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
            { to: '/dashboard/menu/tables', label: t('menu.nav.tables') },
            { to: '/dashboard/menu/qr-codes', label: t('menu.nav.qrCodes') },
          ]
        : [],
    [canReadMenu, t],
  );

  const isMenuSection = location.pathname.startsWith('/dashboard/menu');

  const branchSwitcher = useMemo(
    () => ({
      branches: branches.map((b) => ({ id: b.id, name: b.name })),
      value: currentBranchId,
      ariaLabel: t('dashboard.branchSwitcherLabel'),
      placeholder: t('dashboard.selectBranch'),
    }),
    [branches, currentBranchId, t],
  );

  const onBranchChange = useCallback(
    (branchId: string) => {
      if (org === null) {
        return;
      }
      applyDashboardBranchChange(dispatch, org.id, branchId);
    },
    [dispatch, org],
  );

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
    branchSwitcher,
    onBranchChange,
  };
}

export type DashboardShellViewModel = ReturnType<typeof useDashboardShell>;
