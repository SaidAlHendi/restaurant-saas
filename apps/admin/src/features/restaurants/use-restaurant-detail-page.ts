import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useGetRestaurantQuery } from './restaurants.api.js';

/** View model for one restaurant. The suspend/reactivate action arrives in Step 12e. */
export function useRestaurantDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useGetRestaurantQuery(id, {
    skip: id === '',
  });

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
    formatDate: (iso: string | null) =>
      iso ? dateFormat.format(new Date(iso)) : t('restaurants.none'),
    formatNumber: (value: number) => numberFormat.format(value),
  };
}
