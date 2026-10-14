import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { FeatureKey } from '@app/shared';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan } from '../../session/session.selectors.js';
import { cheapestPlanWithFeature } from '../billing.utils.js';

/** Full-screen "needs a higher plan" state for POS, kitchen, reports and table QR. */
export function useUpgradeRequired(feature: FeatureKey) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canManageBilling = useAppSelector(selectCan('billing.manage'));
  const planKey = cheapestPlanWithFeature(feature);
  const planName = planKey === null ? '' : t(`billing.plans.${planKey}`);

  return {
    title: t('billing.upgrade.title', { feature: t(`billing.features.${feature}`) }),
    description:
      planKey === null
        ? t('billing.upgrade.descriptionGeneric')
        : t('billing.upgrade.description', { plan: planName }),
    hint: canManageBilling ? null : t('billing.upgrade.askOwner'),
    primaryLabel: canManageBilling ? t('billing.upgrade.seePlans') : null,
    onPrimary: () => {
      void navigate('/dashboard/billing');
    },
    backLabel: t('billing.upgrade.back'),
    onBack: () => {
      void navigate('/dashboard');
    },
  };
}

export type UpgradeRequiredViewModel = ReturnType<typeof useUpgradeRequired>;
