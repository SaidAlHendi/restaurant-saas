import { useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';

/** Labels for the numbered pager (`NumberedPagination` from @app/ui), shared by every paged list. */
export function listPaginationLabels(t: TFunction) {
  return {
    navigation: t('common.pagination.navigation'),
    previous: t('common.pagination.previous'),
    next: t('common.pagination.next'),
    page: (n: number) => t('common.pagination.page', { page: n }),
    morePages: t('common.pagination.more'),
  };
}

export type ListPaginationLabels = ReturnType<typeof listPaginationLabels>;

/** What a view needs to render the pager. Hidden when everything fits on one page. */
export interface ListPaginationViewModel {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  labels: ListPaginationLabels;
}

export function pageCountOf(total: number | undefined, pageSize: number | undefined): number {
  if (!total || !pageSize) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Page size of the settings and management tables. */
export const LIST_PAGE_SIZE = 10;

/**
 * Pager for a list the API pages (`page` + `pageSize`). The screen owns `page` (it goes into the
 * query); pass the `total` and `pageSize` of the last response. The page steps back when the last
 * row of the last page is deleted.
 */
export function useListPagination(
  page: number,
  setPage: (page: number) => void,
  meta: { total: number; pageSize: number } | undefined,
  t: TFunction,
): ListPaginationViewModel {
  const pageCount = pageCountOf(meta?.total, meta?.pageSize);
  useEffect(() => {
    if (meta && page > pageCount) {
      setPage(pageCount);
    }
  }, [meta, page, pageCount, setPage]);
  return { page, pageCount, onPageChange: setPage, labels: listPaginationLabels(t) };
}

/**
 * Pages a list that is already fully loaded (for example staff, whose page needs every row for the
 * owner count and the filters). `resetKey` returns to page 1 when the filters change.
 */
export function useClientListPage<T>(
  items: readonly T[],
  t: TFunction,
  resetKey: string,
  pageSize: number = LIST_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [resetKey]);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );
  const pagination: ListPaginationViewModel = {
    page: current,
    pageCount,
    onPageChange: setPage,
    labels: listPaginationLabels(t),
  };
  return { pageItems, pagination };
}
