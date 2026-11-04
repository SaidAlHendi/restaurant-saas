import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../app/hooks.js';
import { selectAdmin } from '../session/session.selectors.js';

export function useOverviewPage() {
  const { t } = useTranslation();
  const admin = useAppSelector(selectAdmin);
  return {
    title: t('overview.title'),
    welcome: admin ? t('overview.welcome', { name: admin.name }) : '',
    emptyHint: t('overview.emptyHint'),
  };
}
