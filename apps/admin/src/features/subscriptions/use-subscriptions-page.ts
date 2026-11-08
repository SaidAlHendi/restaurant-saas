import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { adminSubscriptionStatusSchema, type AdminSubscriptionStatus } from '@app/shared';

import { useListSubscriptionsQuery } from './subscriptions.api.js';

export const ALL = 'all';
/** Pseudo status filter: trials that end within a week. */
export const TRIAL_ENDING = 'trial_ending';

/** View model for the subscriptions list. Filters live in the URL. */
export function useSubscriptionsPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();

  const statusParam = params.get('status');
  const trialEnding = statusParam === TRIAL_ENDING;
  const parsedStatus = adminSubscriptionStatusSchema.safeParse(statusParam);
  const status: AdminSubscriptionStatus | undefined = parsedStatus.success
    ? parsedStatus.data
    : undefined;
  const plan = params.get('plan') ?? undefined;

  const { data, isFetching, isError, refetch } = useListSubscriptionsQuery({
    status,
    plan,
    trialEnding,
  });

  // Plan options come from the unfiltered-by-plan keys seen so far plus the active filter.
  const planOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of data?.items ?? []) seen.set(item.planKey, item.planName);
    if (plan && !seen.has(plan)) seen.set(plan, plan);
    return [...seen.entries()].map(([key, name]) => ({ key, name }));
  }, [data, plan]);

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }),
    [i18n.language],
  );

  const setParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === ALL) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  return {
    t,
    statusValue: trialEnding ? TRIAL_ENDING : (status ?? ALL),
    planValue: plan ?? ALL,
    planOptions,
    items: data?.items ?? [],
    isLoading: isFetching && !data,
    isError,
    isFiltered: Boolean(status || plan || trialEnding),
    retry: () => void refetch(),
    onStatusChange: (value: string) => {
      setParam('status', value);
    },
    onPlanChange: (value: string) => {
      setParam('plan', value);
    },
    formatDate: (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : null),
  };
}
