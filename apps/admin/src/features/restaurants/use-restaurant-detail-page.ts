import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ADMIN_GRANT_PLAN_KEYS } from '@app/shared';
import { toast } from '@app/ui';

import { useAppSelector } from '../../app/hooks.js';
import { selectAdmin } from '../session/session.selectors.js';
import {
  useActivateRestaurantMutation,
  useGetRestaurantQuery,
  useReactivateRestaurantMutation,
  useSuspendRestaurantMutation,
} from './restaurants.api.js';

/** Minor units to a currency string; falls back to "CODE amount" for unknown codes. */
function formatMoney(locale: string, amountMinor: number, currency: string): string {
  try {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(amountMinor / 10 ** digits);
  } catch {
    return `${currency} ${String(amountMinor / 100)}`;
  }
}

/** View model for one restaurant, including the confirm-then-suspend/reactivate action. */
export function useRestaurantDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useGetRestaurantQuery(id, {
    skip: id === '',
  });

  const role = useAppSelector(selectAdmin)?.role;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [suspend, suspendState] = useSuspendRestaurantMutation();
  const [reactivate, reactivateState] = useReactivateRestaurantMutation();

  const [activate, activateState] = useActivateRestaurantMutation();
  const [activateOpen, setActivateOpen] = useState(false);
  const [activatePlan, setActivatePlan] =
    useState<(typeof ADMIN_GRANT_PLAN_KEYS)[number]>('restaurant');
  const [activateUntil, setActivateUntil] = useState('');
  const [activatePaid, setActivatePaid] = useState(false);
  const [activateAmount, setActivateAmount] = useState<number | null>(null);
  const [activateNote, setActivateNote] = useState('');
  const activateCurrency =
    data?.grantablePlans.find((plan) => plan.key === activatePlan)?.currency ?? 'USD';

  const openActivate = () => {
    // Default: one month from today, the common bank-transfer cycle.
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    setActivateUntil(next.toISOString().slice(0, 10));
    setActivatePaid(false);
    setActivateAmount(null);
    setActivateNote('');
    setActivateOpen(true);
  };

  const confirmActivate = async () => {
    if (!data || activateUntil === '' || (activatePaid && activateAmount === null)) return;
    try {
      // End of the chosen day (UTC) so "until 30 Nov" includes the 30th.
      await activate({
        id: data.id,
        planKey: activatePlan,
        until: new Date(`${activateUntil}T23:59:59.000Z`).toISOString(),
        paid: activatePaid,
        ...(activatePaid && activateAmount !== null ? { amountMinor: activateAmount } : {}),
        ...(activateNote.trim() !== '' ? { note: activateNote.trim() } : {}),
      }).unwrap();
      setActivateOpen(false);
      toast.success(t('restaurants.activated'));
    } catch {
      toast.error(t('restaurants.activateError'));
    }
  };

  const isSuspended = data?.status === 'suspended';
  // Only suspended restaurants can be reactivated; trial, active and past_due can be suspended.
  const canChangeStatus = data?.status !== 'cancelled';

  const confirmStatusChange = async () => {
    if (!data) return;
    const wasSuspended = isSuspended;
    try {
      await (wasSuspended ? reactivate(data.id) : suspend(data.id)).unwrap();
      setConfirmOpen(false);
      toast.success(t(wasSuspended ? 'restaurants.reactivated' : 'restaurants.suspended'));
    } catch {
      setConfirmOpen(false);
      toast.error(t('restaurants.statusChangeError'));
      void refetch();
    }
  };

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }),
    [i18n.language],
  );
  const numberFormat = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language]);

  const notFound =
    isError && typeof error === 'object' && 'status' in error && error.status === 404;

  return {
    t,
    dateLocale: i18n.language,
    restaurant: data,
    isLoading,
    isError: isError && !notFound,
    notFound: notFound || id === '',
    retry: () => void refetch(),
    isSuspended,
    /** Suspend / reactivate is for the `super` role; support and billing see a disabled button. */
    canManageStatus: role === 'super',
    canChangeStatus,
    canActivate: role === 'super' || role === 'billing',
    activateOpen,
    setActivateOpen,
    openActivate,
    activatePlan,
    setActivatePlan,
    activateUntil,
    setActivateUntil,
    activatePaid,
    setActivatePaid,
    activateAmount,
    setActivateAmount,
    activateNote,
    setActivateNote,
    activateCurrency,
    canConfirmActivate: activateUntil !== '' && (!activatePaid || activateAmount !== null),
    /** What was recorded for a manual activation, ready to show; null when nothing was recorded. */
    manualPayment:
      data?.subscription?.manualPaid == null
        ? null
        : {
            paid: data.subscription.manualPaid,
            amount:
              data.subscription.manualPaid && data.subscription.manualAmountMinor !== null
                ? formatMoney(
                    i18n.language,
                    data.subscription.manualAmountMinor,
                    data.grantablePlans.find((plan) => plan.key === data.planKey)?.currency ??
                      data.defaultCurrency,
                  )
                : null,
            note: data.subscription.manualNote,
          },
    isActivating: activateState.isLoading,
    confirmActivate: () => void confirmActivate(),
    confirmOpen,
    setConfirmOpen,
    isChangingStatus: suspendState.isLoading || reactivateState.isLoading,
    confirmStatusChange: () => void confirmStatusChange(),
    formatDate: (iso: string | null) =>
      iso ? dateFormat.format(new Date(iso)) : t('restaurants.none'),
    formatNumber: (value: number) => numberFormat.format(value),
  };
}
