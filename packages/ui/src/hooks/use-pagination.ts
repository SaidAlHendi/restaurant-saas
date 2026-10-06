export type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Page numbers to show, always including the first and last page:
 * page 6 of 20 -> [1, '…', 5, 6, 7, '…', 20]. Pages are 1-based.
 */
export function getPageItems(page: number, pageCount: number, siblingCount = 1): PageItem[] {
  if (pageCount <= 0) return [];
  const current = Math.min(Math.max(page, 1), pageCount);
  // first + last + current + siblings + 2 ellipses
  const slots = siblingCount * 2 + 5;
  if (pageCount <= slots) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const start = Math.max(current - siblingCount, 2);
  const end = Math.min(current + siblingCount, pageCount - 1);
  const showStartEllipsis = start > 3;
  const showEndEllipsis = end < pageCount - 2;

  if (!showStartEllipsis) {
    const count = siblingCount * 2 + 3;
    return [...Array.from({ length: count }, (_, i) => i + 1), 'ellipsis-end', pageCount];
  }
  if (!showEndEllipsis) {
    const count = siblingCount * 2 + 3;
    return [
      1,
      'ellipsis-start',
      ...Array.from({ length: count }, (_, i) => pageCount - count + i + 1),
    ];
  }
  return [
    1,
    'ellipsis-start',
    ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
    'ellipsis-end',
    pageCount,
  ];
}

export interface UsePaginationOptions {
  page: number;
  pageCount: number;
  siblingCount?: number;
}

export function usePagination({ page, pageCount, siblingCount = 1 }: UsePaginationOptions) {
  return {
    items: getPageItems(page, pageCount, siblingCount),
    hasPrevious: page > 1,
    hasNext: page < pageCount,
  };
}
