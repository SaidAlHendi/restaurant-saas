import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCursorPages } from '../../lib/use-cursor-pages.js';
import { useListUsersQuery } from './users.api.js';

/** View model for the cross-tenant users list. */
export function useUsersPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const pages = useCursorPages();
  const { data, isFetching, isError, refetch } = useListUsersQuery({
    search,
    cursor: pages.cursor,
  });
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }),
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
    pageNumber: pages.pageNumber,
    hasPrevious: pages.hasPrevious,
    hasNext: Boolean(data?.nextCursor),
    onSearch: (value: string) => {
      setSearch(value);
      pages.reset();
    },
    onNext: () => {
      if (data?.nextCursor) pages.next(data.nextCursor);
    },
    onPrevious: pages.previous,
    formatDate: (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : null),
  };
}
