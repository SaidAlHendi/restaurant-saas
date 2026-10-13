import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { selectPermissions } from '../../session/session.selectors.js';
import {
  settingsTabPath,
  settingsTabsForPermissions,
  type SettingsTabId,
} from '../settings-tabs.utils.js';

export function useSettingsLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useAppSelector(selectPermissions);
  const tabs = useMemo(() => settingsTabsForPermissions(permissions), [permissions]);

  const activeTab: SettingsTabId | null = useMemo(() => {
    if (location.pathname.endsWith('/restaurant')) {
      return 'restaurant';
    }
    if (location.pathname.endsWith('/branch')) {
      return 'branch';
    }
    if (location.pathname.endsWith('/staff')) {
      return 'staff';
    }
    return null;
  }, [location.pathname]);

  const tabItems = tabs.map((tab) => ({
    id: tab,
    label:
      tab === 'restaurant'
        ? t('settings.tabs.restaurant')
        : tab === 'branch'
          ? t('settings.tabs.branch')
          : t('settings.tabs.staff'),
    active: tab === activeTab,
    onSelect: () => {
      void navigate(settingsTabPath(tab));
    },
  }));

  return {
    tabs: tabItems,
    showTabs: tabs.length > 1,
    labels: {
      title: t('settings.title'),
      description: t('settings.description'),
    },
  };
}

export type SettingsLayoutViewModel = ReturnType<typeof useSettingsLayout>;
