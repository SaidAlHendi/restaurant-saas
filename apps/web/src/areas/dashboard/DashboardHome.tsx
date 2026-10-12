import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../app/hooks.js';
import { DashboardWelcomeView } from '../../features/orders/components/DashboardWelcomeView.js';
import { selectCan, selectSessionUser } from '../../features/session/session.selectors.js';

export function DashboardHome() {
  const { t } = useTranslation();
  const user = useAppSelector(selectSessionUser);
  const canReports = useAppSelector(selectCan('reports.read'));

  if (canReports) {
    return null;
  }

  return (
    <DashboardWelcomeView
      title={t('dashboard.welcome', { name: user?.name ?? '' })}
      subtitle={t('dashboard.subtitle')}
    />
  );
}
