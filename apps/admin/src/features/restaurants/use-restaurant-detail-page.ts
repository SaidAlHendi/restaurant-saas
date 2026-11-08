import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { toast } from '@app/ui';

import { useAppSelector } from '../../app/hooks.js';
import { selectAdmin } from '../session/session.selectors.js';
import {
  useGetRestaurantQuery,
  useReactivateRestaurantMutation,
  useSuspendRestaurantMutation,
} from './restaurants.api.js';

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
    restaurant: data,
    isLoading,
    isError: isError && !notFound,
    notFound: notFound || id === '',
    retry: () => void refetch(),
    isSuspended,
    /** Suspend / reactivate is for the `super` role; support and billing see a disabled button. */
    canManageStatus: role === 'super',
    canChangeStatus,
    confirmOpen,
    setConfirmOpen,
    isChangingStatus: suspendState.isLoading || reactivateState.isLoading,
    confirmStatusChange: () => void confirmStatusChange(),
    formatDate: (iso: string | null) =>
      iso ? dateFormat.format(new Date(iso)) : t('restaurants.none'),
    formatNumber: (value: number) => numberFormat.format(value),
  };
}
