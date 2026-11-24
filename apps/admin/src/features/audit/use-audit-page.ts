import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_SIZE, intlLocaleForUi } from '@app/shared';

import { useListAuditQuery } from './audit.api.js';

/** View model for the audit log. Actor and action are partial-match text filters. */
export function useAuditPage() {
  const { t, i18n } = useTranslation();
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, isFetching, isError, refetch } = useListAuditQuery({ actor, action, page });
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocaleForUi(i18n.language), { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language],
  );

  return {
    t,
    actor,
    action,
    isFiltered: actor !== '' || action !== '',
    items: data?.items ?? [],
    isLoading: isFetching && !data,
    isFetching,
    isError,
    retry: () => void refetch(),
    page,
    pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
    total: data?.total ?? 0,
    onPageChange: setPage,
    onActor: (value: string) => {
      setActor(value);
      setPage(1);
    },
    onAction: (value: string) => {
      setAction(value);
      setPage(1);
    },
    formatDate: (iso: string) => dateFormat.format(new Date(iso)),
  };
}
