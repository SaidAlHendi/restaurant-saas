'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDisclosure, useTheme } from '@app/ui';

import { authApi } from '@/lib/api-client';
import { setAppLanguage } from '@/lib/i18n';

import { activeNavId, ADMIN_NAV_ITEMS, navHref } from './nav-items';
import { useAdminMe } from './use-admin-me';

const COLLAPSED_KEY = 'app.admin.sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function useAdminShell() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const page = useSearchParams().get('page');
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const mobile = useDisclosure();
  const me = useAdminMe();

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);
  const onToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, prev ? '0' : '1');
      } catch {
        // Storage can be blocked; the choice still applies for this visit.
      }
      return !prev;
    });
  }, []);

  // A 401/403 from /me means the session is gone: the middleware decides where to send us.
  const unauthenticated = me.isError && 'status' in me.error && (me.error.status === 401 || me.error.status === 403);
  useEffect(() => {
    if (unauthenticated) router.replace('/login');
  }, [router, unauthenticated]);

  const logout = useMutation({
    mutationFn: authApi.logout,
    // Sign out locally even when the server call fails.
    onSettled: () => {
      queryClient.clear();
      router.replace('/login');
      router.refresh();
    },
  });

  const activeId = activeNavId(pathname, page);
  const isArabic = i18n.language.startsWith('ar');
  const isDark = theme === 'forest';
  const admin = me.data?.admin;

  const navGroups = [
    {
      id: 'main',
      items: ADMIN_NAV_ITEMS.map((item) => ({
        id: item.id,
        icon: item.icon,
        label: t(item.labelKey),
        active: item.id === activeId,
        onSelect: () => {
          mobile.setOpen(false);
          router.push(navHref(item));
        },
      })),
    },
  ];

  return {
    ready: !me.isPending && !unauthenticated,
    loadingLabel: t('common.loading'),
    brand: t('app.name'),
    brandInitial: t('app.name').trim().charAt(0).toUpperCase(),
    collapsed,
    onToggleCollapsed,
    mobileOpen: mobile.open,
    onMobileOpenChange: mobile.setOpen,
    onOpenMobile: mobile.onOpen,
    navGroups,
    user: admin ? { name: admin.name, detail: t(`shell.role.${admin.role}`) } : null,
    isDark,
    onToggleTheme: toggleTheme,
    onToggleLanguage: () => {
      void setAppLanguage(isArabic ? 'en' : 'ar');
    },
    loggingOut: logout.isPending,
    onLogout: () => {
      logout.mutate();
    },
    labels: {
      sidebar: t('shell.sidebar'),
      closeSidebar: t('shell.closeSidebar'),
      toggleSidebar: t('shell.toggleSidebar'),
      theme: isDark ? t('shell.lightMode') : t('shell.darkMode'),
      language: isArabic ? 'English' : 'العربية',
      logout: t('auth.logout'),
    },
  };
}
