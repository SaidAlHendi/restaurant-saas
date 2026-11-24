import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { intlLocaleForUi } from '@app/shared';

import { useListUsersQuery } from './users.api.js';

/** View model for the cross-tenant users list. */
export function useUsersPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isFetching, isError, refetch } = useListUsersQuery({ search, page });
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocaleForUi(i18n.language), { dateStyle: 'medium' }),
    [i18n.language],
  );

  return {
    t,
    search,
    items: data?.items ?? [],
    isLoading: isFetching && !data,
    isFetching,
    isError,
    retry: () => void refetch(),
    page,
    pageSize: data?.pageSize ?? 20,
    total: data?.total ?? 0,
    onPageChange: setPage,
    onSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    formatDate: (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : null),
  };
}
