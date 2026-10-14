import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan, selectEntitlements } from '../../session/session.selectors.js';
import { billingBanner } from '../billing.utils.js';

export type BillingBannerViewModel = {
  variant: 'warning' | 'destructive';
  message: string;
  actionLabel: string;
  onAction: () => void;
} | null;

/** Trial ending / trial ended / payment failed banner for owners (billing.manage). */
export function useBillingBanner(): BillingBannerViewModel {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const entitlements = useAppSelector(selectEntitlements);
  const canManageBilling = useAppSelector(selectCan('billing.manage'));

  return useMemo(() => {
    const banner = billingBanner(entitlements, canManageBilling, new Date());
    if (banner === null) {
      return null;
    }
    const onAction = () => {
      void navigate('/dashboard/billing');
    };
    switch (banner.kind) {
      case 'trial':
        return {
          variant: 'warning' as const,
          message:
            banner.daysLeft <= 1
              ? t('billing.banner.trialLastDay')
              : t('billing.banner.trialEnding', { count: banner.daysLeft }),
          actionLabel: t('billing.banner.choosePlan'),
          onAction,
        };
      case 'trial_expired':
        return {
          variant: 'destructive' as const,
          message: t('billing.banner.trialExpired'),
          actionLabel: t('billing.banner.choosePlan'),
          onAction,
        };
      case 'past_due':
        return {
          variant: 'destructive' as const,
          message: t('billing.banner.pastDue'),
          actionLabel: t('billing.banner.fixPayment'),
          onAction,
        };
    }
  }, [canManageBilling, entitlements, navigate, t]);
}
