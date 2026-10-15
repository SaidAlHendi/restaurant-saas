import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../app/hooks.js';
import {
  selectBootstrapDone,
  selectCan,
  selectHasFeature,
} from '../../session/session.selectors.js';

export function useKdsArea() {
  const { t } = useTranslation();
  const bootstrapDone = useAppSelector(selectBootstrapDone);
  const canUseKds = useAppSelector(selectCan('orders.update_status'));
  const hasKdsFeature = useAppSelector(selectHasFeature('kds.access'));

  return {
    t,
    bootstrapDone,
    canUseKds,
    showUpgrade: !hasKdsFeature,
    noAccess: {
      title: t('kds.noAccess.title'),
      description: t('kds.noAccess.description'),
      backLabel: t('kds.noAccess.backToDashboard'),
      backTo: '/dashboard',
    },
  };
}

export type KdsAreaViewModel = ReturnType<typeof useKdsArea>;
