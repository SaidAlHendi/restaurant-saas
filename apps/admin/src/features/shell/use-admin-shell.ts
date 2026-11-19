import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useDisclosure, useTheme } from '@app/ui';

import { useAppDispatch, useAppSelector } from '../../app/hooks.js';
import { setAppLanguage } from '../../lib/i18n.js';
import { useLogoutMutation } from '../auth/auth.api.js';
import { selectAdmin } from '../session/session.selectors.js';
import { clearSession } from '../session/session.slice.js';
import { activeAdminNavId, ADMIN_NAV } from './admin-nav.js';

export function useAdminShell() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const admin = useAppSelector(selectAdmin);
  const { theme, toggleTheme } = useTheme();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  const [collapsed, setCollapsed] = useState(false);
  const mobile = useDisclosure();

  const isArabic = i18n.language.startsWith('ar');
  const isDark = theme === 'forest';
  const activeId = activeAdminNavId(location.pathname);
  const brand = t('app.title');

  const navGroups = useMemo(
    () => [
      {
        id: 'main',
        label: undefined as string | undefined,
        nested: false,
        items: ADMIN_NAV.map((item) => ({
          id: item.id,
          icon: item.icon,
          label: t(item.labelKey),
          active: item.id === activeId,
          onSelect: () => {
            void navigate(item.to);
          },
        })),
      },
    ],
    [activeId, navigate, t],
  );

  const onToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
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

  return {
    brand,
    brandInitial: brand.trim().charAt(0).toUpperCase(),
    collapsed,
    onToggleCollapsed,
    mobileOpen: mobile.open,
    onMobileOpenChange: mobile.setOpen,
    onOpenMobile: mobile.onOpen,
    navGroups,
    user: admin
      ? { name: admin.name, detail: t(`roles.${admin.role}`) }
      : null,
    isDark,
    onToggleTheme: toggleTheme,
    onToggleLanguage: () => {
      void setAppLanguage(isArabic ? 'en' : 'ar');
    },
    loadingLabel: t('common.loading'),
    loggingOut,
    onLogout: () => {
      void onLogout();
    },
    labels: {
      sidebar: t('shell.sidebar'),
      closeSidebar: t('shell.closeSidebar'),
      toggleSidebar: t('shell.toggleSidebar'),
      theme: isDark ? t('shell.lightMode') : t('shell.darkMode'),
      // Always shown in the language it switches to, so it can be found in either language.
      language: isArabic ? 'English' : 'العربية',
      logout: t('auth.logout'),
    },
  };
}
