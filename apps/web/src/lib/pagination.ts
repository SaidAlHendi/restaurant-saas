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
