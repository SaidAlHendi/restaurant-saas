import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCursorPages } from '../../lib/use-cursor-pages.js';
import { useListAuditQuery } from './audit.api.js';

/** View model for the audit log. Actor and action are partial-match text filters. */
export function useAuditPage() {
  const { t, i18n } = useTranslation();
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const pages = useCursorPages();
  const { data, isFetching, isError, refetch } = useListAuditQuery({
    actor,
    action,
    cursor: pages.cursor,
  });
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
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
    pageNumber: pages.pageNumber,
    hasPrevious: pages.hasPrevious,
    hasNext: Boolean(data?.nextCursor),
    onActor: (value: string) => {
      setActor(value);
      pages.reset();
    },
    onAction: (value: string) => {
      setAction(value);
      pages.reset();
    },
    onNext: () => {
      if (data?.nextCursor) pages.next(data.nextCursor);
    },
    onPrevious: pages.previous,
    formatDate: (iso: string) => dateFormat.format(new Date(iso)),
  };
}
