import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';
import type { BillingOverviewResponse, PlanKey } from '@app/shared';

import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { formatMoney } from '../../../lib/money.js';
import { messageFromApiError } from '../../../lib/show-api-error.js';
import { selectCan } from '../../session/session.selectors.js';
import { setEntitlements } from '../../session/session.slice.js';
import {
  useChangePlanMutation,
  useGetBillingOverviewQuery,
  useOpenPortalMutation,
  useStartCheckoutMutation,
} from '../billing.api.js';
import {
  daysUntil,
  hasLivePaddleSubscription,
  parseScheduledChange,
  planAction,
  planFeatureList,
  settledAfterChange,
  settledAfterCheckout,
  settledAfterKeep,
  type PlanAction,
} from '../billing.utils.js';
import { billingErrorMessageKey } from '../plan-gate.utils.js';
import { useActivationPoll } from './use-activation-poll.js';
import { usePaddleCheckout } from './use-paddle-checkout.js';

type StatusVariant = 'success' | 'warning' | 'destructive' | 'secondary' | 'info';

export function useBillingPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const canManageBilling = useAppSelector(selectCan('billing.manage'));
  const uiLocale = i18n.language;

  const [pollingInterval, setPollingInterval] = useState(0);
  const query = useGetBillingOverviewQuery(undefined, {
    skip: !canManageBilling,
    pollingInterval,
  });
  const overview = query.data;
  const poll = useActivationPoll<BillingOverviewResponse>(overview);
  useEffect(() => {
    setPollingInterval(poll.pollingInterval);
  }, [poll.pollingInterval]);

  // Keep nav locks and the banner in step with what this page shows.
  useEffect(() => {
    if (overview !== undefined) {
      dispatch(setEntitlements(overview.entitlements));
    }
  }, [dispatch, overview]);

  const [startCheckout, checkoutState] = useStartCheckoutMutation();
  const [changePlan, changeState] = useChangePlanMutation();
  const [openPortal, portalState] = useOpenPortalMutation();
  const paddle = usePaddleCheckout(uiLocale);
  const [pendingChange, setPendingChange] = useState<PlanKey | null>(null);

  const showError = useCallback(
    (error: unknown) => {
      const key = billingErrorMessageKey(error);
      toast.error(key === null ? messageFromApiError(error, t) : t(key));
    },
    [t],
  );

  const formatDate = useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(uiLocale.startsWith('ar') ? 'ar-SA' : 'en', {
        dateStyle: 'medium',
      }).format(new Date(iso)),
    [uiLocale],
  );

  const current = useMemo(() => {
    if (overview === undefined) {
      return null;
    }
    const { entitlements, subscription } = overview;
    const scheduled = parseScheduledChange(subscription?.scheduledChange);
    const reasonVariant: Record<string, StatusVariant> = {
      trial: 'info',
      paid: 'success',
      comp: 'success',
      past_due: 'destructive',
      trial_expired: 'warning',
      canceled: 'secondary',
      none: 'secondary',
    };
    let detail: string | null = null;
    if (entitlements.reason === 'trial' && entitlements.trialEndsAt !== null) {
      detail = t('billing.current.trialDaysLeft', {
        count: daysUntil(entitlements.trialEndsAt, new Date()),
      });
    } else if (entitlements.reason === 'trial_expired') {
      detail = t('billing.current.trialEnded');
    } else if (scheduled?.action === 'cancel' && scheduled.effectiveAt !== null) {
      detail = t('billing.current.endsOn', { date: formatDate(scheduled.effectiveAt) });
    } else if (entitlements.reason === 'canceled' && entitlements.currentPeriodEnd !== null) {
      detail = t('billing.current.endsOn', { date: formatDate(entitlements.currentPeriodEnd) });
    } else if (entitlements.reason === 'paid' && entitlements.currentPeriodEnd !== null) {
      detail = t('billing.current.renewsOn', { date: formatDate(entitlements.currentPeriodEnd) });
    }
    return {
      planName: t(`billing.plans.${entitlements.planKey}`),
      statusLabel: t(`billing.status.${entitlements.reason}`),
      statusVariant: reasonVariant[entitlements.reason] ?? 'secondary',
      detail,
      pastDue: entitlements.reason === 'past_due',
      branchQuantity:
        subscription !== null && subscription.branchQuantity > 1
          ? t('billing.current.branches', { count: subscription.branchQuantity })
          : null,
      canManageSubscription:
        overview.checkoutEnabled &&
        subscription !== null &&
        subscription.providerCustomerId !== null,
    };
  }, [formatDate, overview, t]);

  const onSubscribe = useCallback(
    async (planKey: PlanKey) => {
      if (!paddle.available) {
        toast.error(t('billing.errors.checkoutUnavailable'));
        return;
      }
      const result = await startCheckout({ planKey });
      if ('error' in result) {
        showError(result.error);
        // A subscription already exists: reload so the page offers "Change plan" instead.
        void query.refetch();
        return;
      }
      try {
        await paddle.openCheckout(result.data, () => {
          poll.start(settledAfterCheckout(planKey));
        });
      } catch {
        toast.error(t('billing.errors.checkoutUnavailable'));
      }
    },
    [paddle, poll, query, showError, startCheckout, t],
  );

  const onConfirmChange = useCallback(async () => {
    if (pendingChange === null) {
      return;
    }
    const planKey = pendingChange;
    const result = await changePlan({ planKey });
    setPendingChange(null);
    if ('error' in result) {
      showError(result.error);
      return;
    }
    poll.start(settledAfterChange(planKey));
  }, [changePlan, pendingChange, poll, showError]);

  const onKeepPlan = useCallback(async () => {
    if (overview === undefined) {
      return;
    }
    const result = await changePlan({ planKey: overview.entitlements.planKey });
    if ('error' in result) {
      showError(result.error);
      return;
    }
    poll.start(settledAfterKeep);
  }, [changePlan, overview, poll, showError]);

  const onManageSubscription = useCallback(async () => {
    const result = await openPortal(undefined);
    if ('error' in result) {
      showError(result.error);
      return;
    }
    window.open(result.data.url, '_blank', 'noopener,noreferrer');
  }, [openPortal, showError]);

  const busy =
    checkoutState.isLoading ||
    changeState.isLoading ||
    portalState.isLoading ||
    poll.status === 'polling';

  const actionLabel = useCallback(
    (action: PlanAction, planKey: PlanKey): string | null => {
      switch (action) {
        case 'subscribe':
          return t('billing.actions.subscribe');
        case 'change':
          return planKey === 'free' ? t('billing.actions.downgradeFree') : t('billing.actions.change');
        case 'keep':
          return t('billing.actions.keep');
        case 'current':
          return t('billing.actions.current');
        case 'none':
          return null;
      }
    },
    [t],
  );

  const plans = useMemo(() => {
    if (overview === undefined) {
      return [];
    }
    const at = new Date();
    return [...overview.plans]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((plan) => {
        const action = planAction(overview, plan.key, at);
        const products = plan.limits['limit.products'];
        const users = plan.limits['limit.users_per_branch'];
        const limitLines = [
          products === undefined || products === null
            ? t('billing.limits.productsUnlimited')
            : t('billing.limits.products', { count: products }),
          ...(users === undefined || users === null
            ? []
            : [t('billing.limits.usersPerBranch', { count: users })]),
        ];
        return {
          key: plan.key,
          name: t(`billing.plans.${plan.key}`),
          price:
            plan.priceMinor === 0
              ? t('billing.price.free')
              : formatMoney(plan.priceMinor, plan.currency, uiLocale),
          priceSuffix:
            plan.priceMinor === 0
              ? null
              : plan.perBranch
                ? t('billing.price.perBranchMonth')
                : t('billing.price.perMonth'),
          isCurrent: overview.entitlements.planKey === plan.key,
          features: [
            ...planFeatureList(plan.features).map((feature) => t(`billing.features.${feature}`)),
            ...limitLines,
          ],
          actionLabel: actionLabel(action, plan.key),
          actionDisabled: action === 'current' || busy,
          actionVariant:
            action === 'keep' || action === 'subscribe' ? ('default' as const) : ('outline' as const),
          onAction: () => {
            if (action === 'subscribe') {
              void onSubscribe(plan.key);
            } else if (action === 'change') {
              setPendingChange(plan.key);
            } else if (action === 'keep') {
              void onKeepPlan();
            }
          },
        };
      });
  }, [actionLabel, busy, onKeepPlan, onSubscribe, overview, t, uiLocale]);

  const live = overview !== undefined && hasLivePaddleSubscription(overview, new Date());

  return {
    redirectTo: canManageBilling ? null : '/dashboard',
    isLoading: query.isLoading,
    isError: query.isError,
    current,
    plans,
    checkoutEnabled: overview?.checkoutEnabled ?? false,
    activation:
      poll.status === 'polling'
        ? { variant: 'info' as const, message: t('billing.activation.polling') }
        : poll.status === 'timeout'
          ? { variant: 'warning' as const, message: t('billing.activation.timeout') }
          : null,
    manageLabel: t('billing.actions.manage'),
    manageDisabled: busy,
    onManageSubscription: () => {
      void onManageSubscription();
    },
    changeDialog: {
      open: pendingChange !== null,
      onOpenChange: (open: boolean) => {
        if (!open) {
          setPendingChange(null);
        }
      },
      title:
        pendingChange === 'free'
          ? t('billing.change.cancelTitle')
          : t('billing.change.title', {
              plan: pendingChange === null ? '' : t(`billing.plans.${pendingChange}`),
            }),
      description:
        pendingChange === 'free'
          ? t('billing.change.cancelDescription')
          : live
            ? t('billing.change.description')
            : '',
      confirmLabel:
        pendingChange === 'free' ? t('billing.change.cancelConfirm') : t('billing.change.confirm'),
      cancelLabel: t('common.cancel'),
      variant: pendingChange === 'free' ? ('destructive' as const) : ('default' as const),
      isConfirming: changeState.isLoading,
      onConfirm: () => {
        void onConfirmChange();
      },
    },
    labels: {
      title: t('billing.title'),
      description: t('billing.description'),
      loading: t('common.loading'),
      loadError: t('billing.loadError'),
      currentPlan: t('billing.current.title'),
      pastDueTitle: t('billing.pastDue.title'),
      pastDueDescription: t('billing.pastDue.description'),
      plansTitle: t('billing.plansTitle'),
      currentBadge: t('billing.actions.current'),
      checkoutDisabled: t('billing.checkoutDisabled'),
    },
  };
}

export type BillingPageViewModel = ReturnType<typeof useBillingPage>;
