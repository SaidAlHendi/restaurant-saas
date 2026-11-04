'use client';

import { useTranslation } from 'react-i18next';

import { useAdminMe } from '../shell/use-admin-me';

export function useOverviewPage() {
  const { t } = useTranslation();
  const me = useAdminMe();
  return {
    title: t('overview.title'),
    description: t('overview.description'),
    welcome: me.data ? t('overview.welcome', { name: me.data.admin.name }) : null,
    empty: t('overview.empty'),
  };
}
