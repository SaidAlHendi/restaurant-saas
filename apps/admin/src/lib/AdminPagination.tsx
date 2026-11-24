import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { intlLocaleForUi } from '@app/shared';
import { NumberedPagination } from '@app/ui';

export interface AdminPaginationProps {
  page: number;
  /** Total rows from the API; the pager hides itself when everything fits on one page. */
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Numbered pager for the admin lists that return `{ items, page, pageSize, total }`. */
export function AdminPagination({ page, total, pageSize, onPageChange }: AdminPaginationProps) {
  const { t, i18n } = useTranslation();
  // Page numbers follow the UI language (Arabic digits in Arabic), like the rest of the admin tables.
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(intlLocaleForUi(i18n.language)),
    [i18n.language],
  );
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;
  return (
    <NumberedPagination
      page={page}
      pageCount={pageCount}
      onPageChange={onPageChange}
      formatNumber={(n) => numberFormat.format(n)}
      labels={{
        navigation: t('common.pagination.navigation'),
        previous: t('common.previous'),
        next: t('common.next'),
        page: (n) => t('common.page', { page: n }),
        morePages: t('common.pagination.more'),
      }}
    />
  );
}
