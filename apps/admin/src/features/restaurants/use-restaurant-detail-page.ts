import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ADMIN_GRANT_PLAN_KEYS, formatMoney, intlLocaleForUi } from '@app/shared';
import { toast } from '@app/ui';

import { useAppSelector } from '../../app/hooks.js';
import { selectAdmin } from '../session/session.selectors.js';
import {
  useActivateRestaurantMutation,
  useGetRestaurantQuery,
  useReactivateRestaurantMutation,
  useSuspendRestaurantMutation,
} from './restaurants.api.js';
import { defaultActivateUntil, summarizePlan } from './plan-summary.js';
import { setupSteps } from './setup-steps.js';

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
    // Start on the plan the restaurant has now; free (not grantable) starts on "restaurant".
    setActivatePlan(ADMIN_GRANT_PLAN_KEYS.find((key) => key === data?.planKey) ?? 'restaurant');
    setActivateUntil(defaultActivateUntil(data));
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
    () => new Intl.DateTimeFormat(intlLocaleForUi(i18n.language), { dateStyle: 'medium' }),
    [i18n.language],
  );
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(intlLocaleForUi(i18n.language)),
    [i18n.language],
  );

  const dateTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocaleForUi(i18n.language), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [i18n.language],
  );

  const notFound =
    isError && typeof error === 'object' && 'status' in error && error.status === 404;

  return {
    t,
    dateLocale: i18n.language,
    direction: i18n.dir(),
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
    planOptions: data?.grantablePlans ?? [],
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
                    data.subscription.manualAmountMinor,
                    data.grantablePlans.find((plan) => plan.key === data.planKey)?.currency ??
                      data.defaultCurrency,
                    i18n.language,
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
    formatDateTime: (iso: string | null) =>
      iso ? dateTimeFormat.format(new Date(iso)) : t('restaurants.none'),
    money: (minor: number, currency: string) => formatMoney(minor, currency, i18n.language),
    formatPercent: (basisPoints: number) =>
      new Intl.NumberFormat(intlLocaleForUi(i18n.language), {
        style: 'percent',
        maximumFractionDigits: 2,
      }).format(basisPoints / 10_000),
    formatHour: (hour: number) => `${String(hour).padStart(2, '0')}:00`,
    languageName: (code: string) =>
      new Intl.DisplayNames([intlLocaleForUi(i18n.language)], { type: 'language' }).of(code) ??
      code,
    countryName: (code: string) =>
      new Intl.DisplayNames([intlLocaleForUi(i18n.language)], { type: 'region' }).of(code) ?? code,
    plan: data ? summarizePlan(data) : null,
    setup: setupSteps(data),
    initial: data?.name.trim().charAt(0).toUpperCase() ?? '',
    activeBranchCount: data?.branches.filter((branch) => branch.isActive).length ?? 0,
  };
}

export type RestaurantDetailVm = ReturnType<typeof useRestaurantDetailPage>;
