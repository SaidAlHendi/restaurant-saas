import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../app/hooks.js';
import { selectBootstrapDone, selectCan } from '../../session/session.selectors.js';

export function usePosArea() {
  const { t } = useTranslation();
  const bootstrapDone = useAppSelector(selectBootstrapDone);
  const canUsePos = useAppSelector(selectCan('orders.create'));

  return {
    t,
    bootstrapDone,
    canUsePos,
    noAccess: {
      title: t('pos.noAccess.title'),
      description: t('pos.noAccess.description'),
      backLabel: t('pos.noAccess.backToDashboard'),
      backTo: '/dashboard',
    },
  };
}

export type PosAreaViewModel = ReturnType<typeof usePosArea>;
