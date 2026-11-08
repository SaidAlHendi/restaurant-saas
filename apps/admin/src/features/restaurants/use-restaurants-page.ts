import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { adminOrgStatusSchema, type AdminOrgListItem, type AdminOrgStatus } from '@app/shared';

import { useListRestaurantsQuery } from './restaurants.api.js';

export const RESTAURANTS_PAGE_SIZE = 20;
export const ALL_STATUSES = 'all';

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** View model for the restaurants list. Filters and page live in the URL so links and back/forward work. */
export function useRestaurantsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const statusParam = adminOrgStatusSchema.safeParse(params.get('status'));
  const status: AdminOrgStatus | undefined = statusParam.success ? statusParam.data : undefined;
  const page = parsePage(params.get('page'));

  const { data, isFetching, isError, refetch } = useListRestaurantsQuery({
    q,
    status,
    page,
    pageSize: RESTAURANTS_PAGE_SIZE,
  });

  const update = useCallback(
    (next: { q?: string; status?: string; page?: number }) => {
      setParams(
        (prev) => {
          const merged = new URLSearchParams(prev);
          const set = (key: string, value: string | undefined) => {
            if (value) merged.set(key, value);
            else merged.delete(key);
          };
          if (next.q !== undefined) set('q', next.q);
          if (next.status !== undefined)
            set('status', next.status === ALL_STATUSES ? '' : next.status);
          // Any filter change goes back to the first page.
          set('page', next.page && next.page > 1 ? String(next.page) : undefined);
          return merged;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const numberFormat = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language]);
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }),
    [i18n.language],
  );

  return {
    t,
    q,
    status: status ?? ALL_STATUSES,
    page,
    pageCount,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading: isFetching && !data,
    isFetching,
    isError,
    retry: () => void refetch(),
    onSearch: (value: string) => {
      update({ q: value });
    },
    onStatusChange: (value: string) => {
      update({ status: value });
    },
    onPageChange: (value: number) => {
      update({ page: value });
    },
    openRestaurant: (row: AdminOrgListItem) => {
      void navigate(`/restaurants/${row.id}`);
    },
    formatNumber: (value: number) => numberFormat.format(value),
    formatDate: (iso: string) => dateFormat.format(new Date(iso)),
  };
}
