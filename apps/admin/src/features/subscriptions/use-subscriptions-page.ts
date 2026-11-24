import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import {
  adminSubscriptionStatusSchema,
  DEFAULT_PAGE_SIZE,
  intlLocaleForUi,
  type AdminSubscriptionStatus,
} from '@app/shared';

import { useListPlansQuery } from '../plans/plans.api.js';
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

  const [page, setPage] = useState(1);
  const { data, isFetching, isError, refetch } = useListSubscriptionsQuery({
    status,
    plan,
    trialEnding,
    page,
  });

  // Plan options come from the plans list, since one page of subscriptions need not show every plan.
  const { data: plansData } = useListPlansQuery(undefined);
  const planOptions = useMemo(() => {
    const options = (plansData?.items ?? []).map((p) => ({ key: p.key, name: p.name }));
    if (plan && !options.some((o) => o.key === plan)) options.push({ key: plan, name: plan });
    return options;
  }, [plansData, plan]);

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocaleForUi(i18n.language), { dateStyle: 'medium' }),
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
    setPage(1);
  };

  return {
    t,
    statusValue: trialEnding ? TRIAL_ENDING : (status ?? ALL),
    planValue: plan ?? ALL,
    planOptions,
    items: data?.items ?? [],
    page,
    pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
    total: data?.total ?? 0,
    onPageChange: setPage,
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
